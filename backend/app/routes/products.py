import os
import re
import uuid
from decimal import Decimal, InvalidOperation
from urllib.parse import parse_qs, unquote, urlparse
from functools import wraps
from flask import (
    Blueprint,
    current_app,
    json,
    jsonify,
    request,
    send_from_directory,
    url_for,
)
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from PIL import Image, UnidentifiedImageError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from werkzeug.exceptions import RequestEntityTooLarge
import requests

from app import db
from app.models import Product, User
products_bp = Blueprint("products", __name__, url_prefix="/api/products")

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}

MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB

MAX_IMAGE_DIMENSION = 4096

def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if claims.get("role") != "ADMIN":
            return jsonify(error="Administrator access required."), 403
        user = db.session.get(User, int(get_jwt_identity()))
        if user is None or not user.is_active or user.role != "ADMIN":
            return jsonify(error="Administrator access required."), 403
        return fn(*args, **kwargs)
    return wrapper

def upload_directory():
    path = os.path.abspath(
        os.path.join(current_app.root_path, "..", "uploads", "products")
    )
    os.makedirs(path, exist_ok=True)
    return path

def save_product_image(file):
    if file is None or not file.filename:
        return None, "Choose an image file."
    # Read at most 5 MB plus one byte to detect oversized uploads.
    raw = file.stream.read(MAX_IMAGE_SIZE + 1)
    if not raw:
        return None, "The uploaded image is empty."
    if len(raw) > MAX_IMAGE_SIZE:
        return None, "Image size must not exceed 5 MB."
    try:
        from io import BytesIO
        with Image.open(BytesIO(raw)) as image:
            if image.format not in ALLOWED_FORMATS:
                return None, "Use a JPEG, PNG, or WebP image."
            if image.width > MAX_IMAGE_DIMENSION or image.height > MAX_IMAGE_DIMENSION:
                return None, "Image dimensions must not exceed 4096 × 4096 pixels."
            image.verify()
        # Re-open and re-encode to strip metadata and avoid trusting filenames.
        with Image.open(BytesIO(raw)) as image:
            image = image.convert("RGB")
            image.thumbnail((1600, 1600))
            filename = f"{uuid.uuid4().hex}.webp"
            destination = os.path.join(upload_directory(), filename)
            image.save(destination, format="WEBP", quality=85, method=6)
        image_url = url_for(
             "products.serve_product_image",
            filename=filename,
             _external=False,
         )
        return image_url, None
    except (UnidentifiedImageError, OSError, ValueError):
        return None, "The uploaded file is not a valid supported image."

def delete_local_image(image_url):
    if not image_url or not image_url.startswith("/uploads/products/"):
        return
    filename = image_url.rsplit("/", 1)[-1]
    if not filename or os.path.basename(filename) != filename:
        return
    path = os.path.join(upload_directory(), filename)
    if os.path.isfile(path):
        os.remove(path)

def read_product_fields(data, existing=None):
    name = data.get("name", existing.name if existing else "")
    category = data.get("category", existing.category if existing else "")
    description = data.get(
        "description", existing.description if existing else ""
    )
    unit = data.get("unit", existing.unit if existing else "packet")
    price_value = data.get("price", existing.price if existing else None)
    stock_value = data.get(
        "stock_quantity", existing.stock_quantity if existing else None
    )
    available_value = data.get(
        "is_available", existing.is_available if existing else True
    )
    if not all(isinstance(v, str) for v in (name, category, unit)):
        return None, "Name, category, and unit must be text."
    name, category, unit = name.strip(), category.strip(), unit.strip()
    if not name or len(name) > 120:
        return None, "Product name is required and must be at most 120 characters."
    if not category or len(category) > 80:
        return None, "Category is required and must be at most 80 characters."
    if not unit or len(unit) > 30:
        return None, "Unit is required and must be at most 30 characters."
    if description is not None and not isinstance(description, str):
        return None, "Description must be text."
    if description and len(description) > 5000:
        return None, "Description must be at most 5000 characters."
    try:
        price = Decimal(str(price_value))
        if not price.is_finite() or price < 0 or price > Decimal("99999999.99"):
            raise InvalidOperation
        if price.as_tuple().exponent < -2:
            raise InvalidOperation
    except (InvalidOperation, ValueError, TypeError):
        return None, "Price must be a valid non-negative amount with up to 2 decimals."
    try:
        if isinstance(stock_value, bool):
            raise ValueError
        stock = int(str(stock_value))
        if str(stock) != str(stock_value).strip() or stock < 0:
            raise ValueError
    except (ValueError, TypeError):
        return None, "Stock quantity must be a non-negative whole number."
    if isinstance(available_value, bool):
        is_available = available_value
    elif isinstance(available_value, str) and available_value.lower() in {
        "true", "false"
    }:
        is_available = available_value.lower() == "true"
    else:
        return None, "is_available must be true or false."
    return {
        "name": name,
        "category": category,
        "description": description.strip() if description else None,
        "unit": unit,
        "price": price,
        "stock_quantity": stock,
        "is_available": is_available,
    }, None

@products_bp.get("/images/<path:filename>")

def serve_product_image(filename):
    if os.path.basename(filename) != filename or not filename.endswith(".webp"):
        return jsonify(error="Invalid image filename."), 404
    return send_from_directory(
        upload_directory(),
        filename,
        mimetype="image/webp",
        max_age=3600,
    )

@products_bp.get("")

def list_products():
    products = db.session.scalars(
        select(Product)
        .where(Product.is_available.is_(True), Product.stock_quantity > 0)
        .order_by(Product.name.asc())
    ).all()
    return jsonify(products=[product.to_dict() for product in products]), 200

@products_bp.get("/<int:product_id>")

def get_product(product_id):
    product = db.session.get(Product, product_id)
    if product is None or not product.is_available or product.stock_quantity <= 0:
        return jsonify(error="Product not found or unavailable."), 404
    return jsonify(product=product.to_dict()), 200

@products_bp.post("")
@admin_required

def create_product():
    try:
        fields, error = read_product_fields(request.form)
        if error:
            return jsonify(error=error), 400
        image_file = request.files.get("image")
        image_url = None
        if image_file and image_file.filename:
            image_url, error = save_product_image(image_file)
            if error:
                return jsonify(error=error), 400
        product = Product(**fields, image_url=image_url)
        db.session.add(product)
        db.session.commit()
        return jsonify(
            message="Product created successfully.",
            product=product.to_dict(),
        ), 201
    except RequestEntityTooLarge:
        db.session.rollback()
        return jsonify(error="Request is too large."), 413
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Failed to create product")
        return jsonify(error="Unable to create product."), 500

@products_bp.put("/<int:product_id>")
@admin_required

def update_product(product_id):
    product = db.session.get(Product, product_id)
    if product is None:
        return jsonify(error="Product not found."), 404
    try:
        fields, error = read_product_fields(request.form, existing=product)
        if error:
            return jsonify(error=error), 400
        old_image_url = product.image_url
        image_file = request.files.get("image")
        new_image_url = None
        if image_file and image_file.filename:
            new_image_url, error = save_product_image(image_file)
            if error:
                return jsonify(error=error), 400
        for key, value in fields.items():
            setattr(product, key, value)
        if new_image_url:
            product.image_url = new_image_url
        db.session.commit()
        if new_image_url and old_image_url != new_image_url:
            delete_local_image(old_image_url)
        return jsonify(
            message="Product updated successfully.",
            product=product.to_dict(),
        ), 200
    except RequestEntityTooLarge:
        db.session.rollback()
        return jsonify(error="Request is too large."), 413
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Failed to update product")
        return jsonify(error="Unable to update product."), 500

@products_bp.delete("/<int:product_id>")
@admin_required

def delete_product(product_id):
    product = db.session.get(Product, product_id)
    if product is None:
        return jsonify(error="Product not found."), 404
    old_image_url = product.image_url
    try:
        db.session.delete(product)
        db.session.commit()
        delete_local_image(old_image_url)
        return jsonify(message="Product deleted successfully."), 200
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Failed to delete product")
        return jsonify(error="Unable to delete product."), 500

@products_bp.get("/admin/all")
@admin_required

def list_all_products_admin():
    products = db.session.scalars(
        select(Product).order_by(Product.name.asc())
    ).all()
    return jsonify(
        products=[product.to_dict() for product in products],
        total=len(products),
    ), 200

AI_CATEGORIES = [
    "Fruits", "Vegetables", "Dairy & Eggs",
    "Rice, Grains & Millets", "Dals, Pulses & Beans",
    "Flour & Baking Essentials",
    "Oils, Ghee & Cooking Essentials", "Spices & Masalas",
    "Sugar, Salt & Sweeteners", "Bread & Bakery",
    "Snacks & Savouries", "Biscuits & Chocolates",
    "Tea, Coffee & Beverages", "Packaged & Instant Foods",
    "Pickles, Sauces & Spreads", "Frozen Foods & Ice Cream",
    "Meat & Seafood", "Personal Care", "Oral & Grooming Care",
    "Household Cleaning", "Paper & Disposable Products",
    "Laundry & Fabric Care", "Baby Care", "Health & First Aid",
    "Stationery & School Supplies", "Kitchen & Dining Essentials",
    "Home & Household Essentials", "Electrical Accessories",
    "Mobile & Small Electronics", "Clothing & Basic Apparel",
    "Footwear & Accessories", "Beauty & Cosmetics",
    "Women's Hygiene", "Toys & Children's Products",
    "Pet Supplies", "Gardening & Plants", "Pooja & Religious Items",
    "Gifts & Celebration Supplies", "Hardware & Repair Essentials",
    "Travel & Daily Carry", "Books & Reading",
    "Sports & Outdoor Essentials", "Seasonal & Festival Products",
    "Local & Regional Products", "Miscellaneous Daily Essentials",
]

@products_bp.post("/ai-draft")
@admin_required

def generate_product_ai_draft():
    data = request.get_json(silent=True) or {}
    instruction = data.get("instruction", "")
    if not isinstance(instruction, str) or not instruction.strip():
        return jsonify({"error": "Enter or speak product details."}), 400
    instruction = instruction.strip()
    if len(instruction) > 3000:
        return jsonify({"error": "Maximum instruction length is 3000 characters."}), 400
    base_url = (
        current_app.config.get("AI_PROXY_BASE_URL")
        or os.getenv("AI_PROXY_BASE_URL")
        or "http://127.0.0.1:10531/v1"
    ).rstrip("/")
    model = (
        current_app.config.get("AI_MODEL")
        or os.getenv("AI_MODEL")
        or "gpt-6-luna"
    )
    try:
        timeout = int(os.getenv("AI_REQUEST_TIMEOUT", "60"))
        timeout = max(5, min(timeout, 120))
    except ValueError:
        timeout = 60
    prompt = f"""
You are a product listing assistant for Pure Pail Marketplace.
Understand the user's instruction in English or Tamil.
Return only valid JSON with these keys:
name, category, description, price, stock_quantity, unit, is_available.
Allowed categories:
{json.dumps(AI_CATEGORIES, ensure_ascii=False)}
Rules:
- Extract the product name from the instruction.
- Choose the exact matching category from the allowed list.
- Generate a useful, natural product description for the product.
- The description is REQUIRED whenever a product name is available.
- If the user provides product details, include those details in the description.
- Do not invent ingredients, health benefits, certifications, origin,
  quality claims, or other unverified facts.
- For generic products, write a neutral description based on their
  common use without making unsupported claims.
- Do not invent the price, stock quantity, or pack size.
- Missing price, stock_quantity, or unit must be an empty string.
- Price must be a numeric string, such as "100" or "99.50".
- Stock must be a whole-number string.
- Unit must be like "250 g", "1 kg", "500 ml", "1 l", or "2 pcs".
- is_available must be a JSON boolean.
- Return JSON only, without Markdown.
User's instruction:
{json.dumps(instruction, ensure_ascii=False)}
"""
    try:
        response = requests.post(
            f"{base_url}/chat/completions",
            json={
                "model": model,
                "messages": [
                    {
                        "role": "system",
                        "content": "Return only the requested product JSON.",
                    },
                    {"role": "user", "content": prompt},
                ],
            },
            timeout=timeout,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        if not isinstance(content, str):
            raise ValueError("Invalid AI response")
        content = re.sub(
            r"^\\\`\\\`\\\`(?:json)?\s*|\s*\\\`\\\`\\\`$",
            "",
            content.strip(),
            flags=re.IGNORECASE,
        )
        draft = json.loads(content)
        if not isinstance(draft, dict):
            raise ValueError("Expected JSON object")
    except requests.Timeout:
        return jsonify({"error": "AI request timed out. Try again."}), 504
    except requests.RequestException as exc:
        if exc.response is not None:
            current_app.logger.error(
            "AI proxy HTTP error: status=%s body=%s",
            exc.response.status_code,
            exc.response.text[:2000],
        )
        else:
            current_app.logger.exception("AI proxy connection failed")
        return jsonify({
        "error": "AI proxy request failed. Check the backend logs."
        }), 502
    except (ValueError, KeyError, IndexError, TypeError):
        current_app.logger.exception("Invalid AI response")
        return jsonify({"error": "AI returned an invalid draft."}), 502
    def text_field(key, limit):
        value = draft.get(key, "")
        return value.strip()[:limit] if isinstance(value, str) else ""
    category_map = {c.casefold(): c for c in AI_CATEGORIES}
    category_input = text_field("category", 80)
    price = text_field("price", 20)
    stock = text_field("stock_quantity", 12)
    unit = text_field("unit", 30)
    if price and not re.fullmatch(r"\d+(?:\.\d{1,2})?", price):
        price = ""
    if stock and not re.fullmatch(r"\d+", stock):
        stock = ""
    if unit and not re.fullmatch(
        r"\d+\s*(?:g|kg|ml|l|pcs)", unit, re.IGNORECASE
    ):
        unit = ""
    return jsonify({
        "draft": {
            "name": text_field("name", 120),
            "category": category_map.get(category_input.casefold(), ""),
            "description": text_field("description", 5000),
            "price": price,
            "stock_quantity": stock,
            "unit": unit,
            "is_available": draft.get("is_available") is not False,
        }
    }), 200

def find_google_image_fallback(name, category, description=""):
    """Fallback image search using Google Images HTML, with download/image validation.
    Google can change its HTML at any time, so this deliberately fails softly and
    leaves manual upload available. Google Images results do not guarantee reuse rights.
    """
    import base64
    import ipaddress
    from io import BytesIO
    from bs4 import BeautifulSoup
    query = " ".join(part for part in (name, category, description, "product photo") if part)
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.8",
    }
    try:
        search_response = requests.get(
            "https://www.google.com/search",
            params={"tbm": "isch", "q": query, "hl": "en", "safe": "active"},
            headers=headers,
            timeout=(4, 12),
        )
        search_response.raise_for_status()
        soup = BeautifulSoup(search_response.text, "html.parser")
    except Exception:
        current_app.logger.warning("Google Images search failed", exc_info=True)
        return None
    image_candidates = []
    seen = set()
    def add_candidate(image_url, source_page=""):
        if not isinstance(image_url, str):
            return
        image_url = unquote(image_url.strip())
        parsed = urlparse(image_url)
        if parsed.scheme != "https" or not parsed.hostname:
            return
        host = parsed.hostname.lower()
        if host in {"localhost", "localhost.localdomain"} or host.endswith((".local", ".internal")):
            return
        try:
            ip = ipaddress.ip_address(host)
            if not ip.is_global:
                return
        except ValueError:
            pass
        if image_url not in seen:
            seen.add(image_url)
            image_candidates.append({"image_url": image_url, "source_page": source_page})
    # Support the older rg_meta JSON used by the supplied downloader.
    for node in soup.select("div.rg_meta"):
        try:
            metadata = json.loads(node.get_text())
            add_candidate(metadata.get("ou", ""), metadata.get("ru", ""))
        except (ValueError, TypeError):
            continue
    # Some Google responses embed image URLs in script JSON rather than result links.
    # Decode the common JSON/HTML escape sequences before validating each URL.
    page_text = soup.get_text(" ", strip=False) + "\n" + search_response.text
    image_url_pattern = re.compile(r'"ou"\s*:\s*"(https?:\\?/\\?/[^"\\]+|https?://[^"\\]+)"')
    source_url_pattern = re.compile(r'"ru"\s*:\s*"(https?:\\?/\\?/[^"\\]+|https?://[^"\\]+)"')
    embedded_images = image_url_pattern.findall(page_text)
    embedded_sources = source_url_pattern.findall(page_text)
    for index, image_url in enumerate(embedded_images):
        image_url = (image_url.replace("\\/", "/").replace("\\u003d", "=")
                     .replace("\\u0026", "&").replace("&amp;", "&"))
        source_page = embedded_sources[index] if index < len(embedded_sources) else ""
        source_page = source_page.replace("\\/", "/").replace("\\u003d", "=").replace("\\u0026", "&")
        add_candidate(image_url, source_page)
    # Current Google markup commonly stores imgurl/imgrefurl in result links.
    for anchor in soup.select('a[href*="imgurl="]'):
        href = anchor.get("href", "")
        parsed_link = urlparse(href)
        params = parse_qs(parsed_link.query)
        image_url = (params.get("imgurl") or [""])[0]
        source_page = (params.get("imgrefurl") or [""])[0]
        add_candidate(image_url, source_page)
    current_app.logger.info(
        "Google Images parsed %d candidate URLs for query=%r (HTTP %s, title=%r)",
        len(image_candidates), query, search_response.status_code,
        soup.title.get_text(" ", strip=True) if soup.title else "no title",
    )
    # Last resort: try actual HTTPS image elements (often Google thumbnails).
    for img in soup.find_all("img"):
        add_candidate(img.get("data-src") or img.get("src", ""))
    for candidate in image_candidates[:30]:
        response = None
        try:
            response = requests.get(
                candidate["image_url"],
                headers={"User-Agent": headers["User-Agent"]},
                stream=True,
                timeout=(4, 12),
                allow_redirects=True,
            )
            if response.status_code != 200:
                continue
            final_url = urlparse(response.url)
            if final_url.scheme != "https" or not final_url.hostname:
                continue
            content_type = response.headers.get("Content-Type", "").split(";", 1)[0].lower()
            if not content_type.startswith("image/"):
                continue
            raw = bytearray()
            for chunk in response.iter_content(chunk_size=65536):
                if chunk:
                    raw.extend(chunk)
                if len(raw) > MAX_IMAGE_SIZE:
                    break
            if not raw or len(raw) > MAX_IMAGE_SIZE:
                continue
            with Image.open(BytesIO(raw)) as image:
                if (image.format not in ALLOWED_FORMATS or
                        image.width > MAX_IMAGE_DIMENSION or
                        image.height > MAX_IMAGE_DIMENSION):
                    continue
                image.verify()
            with Image.open(BytesIO(raw)) as image:
                image = image.convert("RGB")
                image.thumbnail((1600, 1600))
                output = BytesIO()
                image.save(output, format="WEBP", quality=85, method=6)
            return {
                "image_base64": base64.b64encode(output.getvalue()).decode("ascii"),
                "mime_type": "image/webp",
                "filename": "product-image.webp",
                "source_page": candidate["source_page"],
                "license": "unknown - verify reuse rights before publishing",
                "license_version": "",
                "license_url": "",
                "artist": "",
                "attribution": "Found through Google Images; original source and reuse rights must be verified.",
                "provider": "Google Images",
            }
        except (requests.RequestException, UnidentifiedImageError, OSError, ValueError):
            continue
        finally:
            if response is not None:
                response.close()
    current_app.logger.warning("Google Images returned no downloadable image for %r", name)
    return None

@products_bp.post("/find-image")
@admin_required
def find_product_image():
    """Search Google Images for a matching product photo and return a validated WebP."""
    data = request.get_json(silent=True) or {}
    name = data.get("name", "")
    category = data.get("category", "")
    description = data.get("description", "")

    if not isinstance(name, str) or not isinstance(category, str) or not name.strip() or not category.strip():
        return jsonify(error="Product name and category are required."), 400
    if not isinstance(description, str):
        description = ""

    name = name.strip()[:200]
    category = category.strip()[:100]
    description = description.strip()[:500]

    try:
        result = find_google_image_fallback(name, category, description)
    except Exception:
        current_app.logger.exception("Google Images product lookup failed")
        result = None

    if result:
        return jsonify(result), 200
    # Return a direct browser search link when automatic download fails. The frontend
    # can offer this link so an admin can choose an image from Google's results.
    from urllib.parse import urlencode
    google_search_url = "https://www.google.com/search?" + urlencode({
        "tbm": "isch",
        "q": " ".join(part for part in (name, category, description) if part).strip(),
    })
    return jsonify(
        image_base64=None,
        message="No image could be downloaded automatically. Open Google Images to choose one, or upload an image manually.",
        provider="Google Images",
        google_search_url=google_search_url,
    ), 200
