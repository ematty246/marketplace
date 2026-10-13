"""Pure Pail English-only conversational shopping assistant.

Register assistant_bp in the Flask app factory. Product/stock values always come
from PostgreSQL. Customer-only pages require a valid customer access token.
"""
import json
import os
import requests
from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import select

from app import db
from app.models import Product, User

assistant_bp = Blueprint("assistant", __name__, url_prefix="/api/assistant")
MAX_MESSAGE_LENGTH = 1000
MAX_CART_ITEMS = 50
MAX_QUANTITY = 100

SYSTEM_PROMPT = r'''You are Pure Pail Marketplace's friendly, English-only shopping assistant.
Always reply in English, including when the customer speaks another language.
Use only the supplied live catalogue to identify products. Never invent product IDs,
stock levels, prices, order details, or completed actions. Browser cart data is only a
snapshot and is not authoritative for price or inventory.

You may suggest ONLY these actions:
none, add_to_cart, set_cart_quantity, remove_from_cart, clear_cart, go_to_cart,
go_to_checkout, show_products, search_products, show_orders, show_account,
go_to_login, go_to_register.

Rules:
- add_to_cart requires a matching catalogue product ID and a whole quantity.
- remove_from_cart and set_cart_quantity are valid only for an item in the supplied cart.
- search_products requires a short query.
- show_orders and show_account only navigate; do not claim you retrieved private data.
- go_to_checkout only opens checkout for review. Never claim an order was submitted.
- Never submit an order, process payment, change an account, cancel an order, log out,
  or access administrator pages. Ask the customer to use the secure application flow.
- If the customer asks for a private customer page and is not authenticated, suggest login.
- If the request is ambiguous, return action type none and ask a brief clarification.
Return ONLY valid JSON in this schema:
{"reply":"text","action":{"type":"none|add_to_cart|set_cart_quantity|remove_from_cart|clear_cart|go_to_cart|go_to_checkout|show_products|search_products|show_orders|show_account|go_to_login|go_to_register","product_id":null,"quantity":null,"query":null}}
'''


def _safe_cart(raw_cart):
    """Sanitize a browser cart snapshot; never use it for prices or stock."""
    result = []
    if not isinstance(raw_cart, list):
        return result
    for item in raw_cart[:MAX_CART_ITEMS]:
        if not isinstance(item, dict):
            continue
        pid, qty = item.get("product_id"), item.get("quantity")
        if isinstance(pid, bool) or isinstance(qty, bool):
            continue
        try:
            pid, qty = int(pid), int(qty)
        except (TypeError, ValueError, OverflowError):
            continue
        if pid > 0 and 1 <= qty <= 10000:
            result.append({"product_id": pid, "quantity": qty})
    return result


def _none_action():
    return {"type": "none", "product_id": None, "quantity": None, "query": None}


@assistant_bp.post("/chat")
@jwt_required(optional=True)
def chat():
    body = request.get_json(silent=True) or {}
    message = body.get("message", "")
    if not isinstance(message, str):
        return jsonify(error="Please say or type a request."), 400
    message = message.strip()
    if not message:
        return jsonify(error="Please say or type a request."), 400
    if len(message) > MAX_MESSAGE_LENGTH:
        return jsonify(error="Message is too long."), 400

    # Resolve identity from the verified JWT, never from request JSON.
    customer = None
    identity = get_jwt_identity()
    if identity is not None:
        try:
            user_id = int(identity)
        except (TypeError, ValueError):
            return jsonify(error="Invalid session. Please sign in again."), 401
        customer = db.session.get(User, user_id)
        if customer is None or not customer.is_active:
            return jsonify(error="Account is unavailable. Please sign in again."), 401

    products = db.session.scalars(
        select(Product).where(Product.is_available.is_(True), Product.stock_quantity > 0)
        .order_by(Product.name.asc())
    ).all()
    catalog = [{
        "id": p.id,
        "name": p.name,
        "category": p.category or "",
        "description": p.description or "",
        "unit": p.unit or "",
        "stock_quantity": int(p.stock_quantity or 0),
        # Price is included only as a display fact from the database; checkout recalculates it.
        "price": str(p.price),
    } for p in products]
    safe_cart = _safe_cart(body.get("cart"))

    base_url = os.getenv("AI_PROXY_BASE_URL", "http://127.0.0.1:10531/v1").rstrip("/")
    model = os.getenv("AI_MODEL", "gpt-6-luna")
    proxy_token = os.getenv("AI_PROXY_API_KEY", "")
    headers = {"Content-Type": "application/json"}
    if proxy_token:
        headers["Authorization"] = f"Bearer {proxy_token}"

    user_payload = {
        "language": "en-IN",
        "customer_message": message,
        "current_customer_page": str(body.get("page", ""))[:120],
        "customer_authenticated": bool(customer and customer.role == "CUSTOMER"),
        "available_catalog": catalog,
        "current_cart_product_ids_and_quantities": safe_cart,
    }
    try:
        response = requests.post(
            f"{base_url}/chat/completions",
            headers=headers,
            timeout=(5, 35),
            json={"model": model, "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)},
            ]},
        )
        if not response.ok:
            current_app.logger.error("AI proxy returned HTTP %s", response.status_code)
            return jsonify(error="AI assistant service returned an error. Check Flask logs and proxy configuration."), 502
        content = response.json()["choices"][0]["message"]["content"]
        if not isinstance(content, str):
            raise ValueError("AI response content was not text")
        content = content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        data = json.loads(content)
        if not isinstance(data, dict):
            raise ValueError("AI response was not a JSON object")
    except (requests.RequestException, ValueError, KeyError, TypeError, IndexError):
        current_app.logger.exception("Failed to process assistant request")
        return jsonify(error="I couldn't process that just now. Please try again."), 502

    reply = str(data.get("reply", "How can I help you shop today?"))[:1200]
    raw_action = data.get("action") if isinstance(data.get("action"), dict) else {}
    kind = raw_action.get("type", "none")
    allowed = {
        "none", "add_to_cart", "set_cart_quantity", "remove_from_cart", "clear_cart",
        "go_to_cart", "go_to_checkout", "show_products", "search_products", "show_orders",
        "show_account", "go_to_login", "go_to_register",
    }
    if kind not in allowed:
        kind = "none"
    action = _none_action()
    action["type"] = kind

    # Private customer areas must never be suggested as accessible to a guest/admin.
    if kind in {"show_orders", "show_account"} and not (customer and customer.role == "CUSTOMER"):
        action["type"] = "go_to_login"
        reply = "Please sign in to your customer account first. I'll open the customer login page."
        kind = "go_to_login"

    if kind in {"add_to_cart", "set_cart_quantity", "remove_from_cart"}:
        raw_pid = raw_action.get("product_id")
        try:
            product_id = int(raw_pid) if not isinstance(raw_pid, bool) else None
        except (TypeError, ValueError, OverflowError):
            product_id = None
        product = next((p for p in products if p.id == product_id), None)
        cart_ids = {x["product_id"] for x in safe_cart}

        if kind == "remove_from_cart":
            if product_id is not None and product_id in cart_ids:
                action.update(product_id=product_id)
            else:
                action["type"] = "none"
                reply = "I couldn't find that product in your current cart. Which item would you like to remove?"
        elif not product:
            action["type"] = "none"
            reply = "I couldn't verify that product in the current available catalogue. Please search for it by name."
        elif kind == "set_cart_quantity" and product_id not in cart_ids:
            action["type"] = "none"
            reply = "That product isn't in your cart yet. Add it first, or tell me which cart item you mean."
        else:
            raw_qty = raw_action.get("quantity")
            try:
                quantity = int(raw_qty) if not isinstance(raw_qty, bool) else None
            except (TypeError, ValueError, OverflowError):
                quantity = None
            if quantity is None or not 1 <= quantity <= MAX_QUANTITY:
                action["type"] = "none"
                reply = f"Please specify a whole-number quantity between 1 and {MAX_QUANTITY}."
            elif quantity > int(product.stock_quantity or 0):
                action["type"] = "none"
                reply = f"Only {int(product.stock_quantity or 0)} unit(s) of {product.name} are currently available. How many would you like?"
            else:
                action.update(product_id=product.id, quantity=quantity)

    elif kind == "search_products":
        query = raw_action.get("query", "")
        query = query.strip()[:100] if isinstance(query, str) else ""
        if query:
            action["query"] = query
        else:
            action["type"] = "show_products"

    return jsonify(reply=reply, action=action), 200
