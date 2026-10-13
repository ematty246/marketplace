from collections import defaultdict
from decimal import Decimal
from functools import wraps
import os, re, uuid
import requests
from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from sqlalchemy import select
from app import db
from app.models import Order, OrderItem, Product, User

orders_bp = Blueprint("orders", __name__, url_prefix="/api/orders")


def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        if get_jwt().get("role") != "ADMIN":
            return jsonify(error="Administrator access required."), 403
        user = db.session.get(User, int(get_jwt_identity()))
        if user is None or not user.is_active or user.role != "ADMIN":
            return jsonify(error="Administrator access required."), 403
        return fn(*args, **kwargs)
    return wrapper


def validate_phone(value):
    if not isinstance(value, str):
        return None

    phone = value.strip()

    if not re.fullmatch(r"\d{10}", phone):
        return None

    return phone


def geocode_address(address):
    """Return coordinates and a Google Maps URL; a geocoding failure won't block checkout."""
    key = current_app.config.get("OPENCAGE_API_KEY") or os.getenv("OPENCAGE_API_KEY")
    fallback = "https://www.google.com/maps/search/?api=1&query=" + requests.utils.quote(address)
    if not key:
        current_app.logger.warning("OPENCAGE_API_KEY is not configured; saving address without coordinates")
        return None, None, fallback
    try:
        response = requests.get("https://api.opencagedata.com/geocode/v1/json",
            params={"q": address, "key": key, "limit": 1, "no_annotations": 1}, timeout=(3, 8))
        response.raise_for_status()
        results = response.json().get("results", [])
        if results:
            geo = results[0].get("geometry", {})
            lat, lon = geo.get("lat"), geo.get("lng")
            if isinstance(lat, (int, float)) and isinstance(lon, (int, float)):
                return lat, lon, f"https://www.google.com/maps/search/?api=1&query={lat},{lon}"
    except (requests.RequestException, ValueError, TypeError):
        current_app.logger.warning("Geocoding failed; using address search URL", exc_info=True)
    return None, None, fallback


@orders_bp.post("")
@jwt_required()
def place_order():
    data = request.get_json(silent=True) or {}
    raw_items, address = data.get("items"), data.get("shipping_address")
    phone = validate_phone(data.get("phone_number"))
    if phone is None:
        return jsonify(error="Enter a valid 10-digit phone number."), 400
    if data.get("payment_method", "COD") != "COD":
        return jsonify(error="Only Cash on Delivery is currently supported."), 400
    if not isinstance(address, str) or not address.strip() or len(address.strip()) > 500:
        return jsonify(error="Enter a delivery address (maximum 500 characters)."), 400
    if not isinstance(raw_items, list) or not raw_items or len(raw_items) > 100:
        return jsonify(error="Your cart must contain between 1 and 100 item entries."), 400

    quantities = defaultdict(int)
    try:
        for item in raw_items:
            if not isinstance(item, dict): raise ValueError
            pid, qty = item.get("product_id"), item.get("quantity")
            if isinstance(pid, bool) or isinstance(qty, bool): raise ValueError
            pid, qty = int(pid), int(qty)
            if pid <= 0 or qty <= 0 or qty > 10000: raise ValueError
            quantities[pid] += qty
            if quantities[pid] > 10000: raise ValueError
    except (ValueError, TypeError, OverflowError):
        return jsonify(error="Each item needs a valid product_id and positive whole-number quantity."), 400

    user = db.session.get(User, int(get_jwt_identity()))
    if user is None or not user.is_active:
        return jsonify(error="Customer account is unavailable."), 401
    if user.role != "CUSTOMER":
        return jsonify(error="Only customer accounts can place customer orders."), 403

    try:
        products = db.session.scalars(select(Product).where(Product.id.in_(sorted(quantities)))
            .order_by(Product.id).with_for_update()).all()
        by_id = {p.id: p for p in products}
        missing = sorted(set(quantities) - set(by_id))
        if missing:
            db.session.rollback()
            return jsonify(error="One or more products no longer exist.", product_ids=missing), 404
        for pid, qty in quantities.items():
            product = by_id[pid]
            if not product.is_available:
                db.session.rollback(); return jsonify(error=f"{product.name} is currently unavailable."), 409
            if product.stock_quantity < qty:
                available = product.stock_quantity
                db.session.rollback()
                return jsonify(error=f"Not enough stock for {product.name}.", product_id=pid, available_stock=available), 409

        total, order_items = Decimal("0.00"), []
        for pid, qty in quantities.items():
            product = by_id[pid]
            unit_price = Decimal(str(product.price)).quantize(Decimal("0.01"))
            line_total = (unit_price * qty).quantize(Decimal("0.01"))
            total += line_total
            order_items.append(OrderItem(product_id=product.id, product_name=product.name, unit=product.unit,
                unit_price=unit_price, quantity=qty, line_total=line_total))
            product.stock_quantity -= qty
            if product.stock_quantity == 0: product.is_available = False

        address = address.strip()
        lat, lon, maps_url = geocode_address(address)
        order = Order(order_number=uuid.uuid4().hex.upper(), user_id=user.id,
            total_amount=total.quantize(Decimal("0.01")), payment_method="COD", payment_status="UNPAID",
            order_status="PLACED", shipping_address=address, phone_number=phone,
            latitude=lat, longitude=lon, google_maps_url=maps_url, items=order_items)
        db.session.add(order)
        db.session.commit()
        return jsonify(message="Order placed successfully. Please pay by Cash on Delivery.", order=order.to_dict()), 201
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Failed to place customer order")
        return jsonify(error="Unable to place the order. Please try again."), 500


@orders_bp.get("/my")
@jwt_required()
def my_orders():
    user = db.session.get(User, int(get_jwt_identity()))
    if user is None or not user.is_active:
        return jsonify(error="Customer account is unavailable."), 401
    orders = db.session.scalars(select(Order).where(Order.user_id == user.id)
        .order_by(Order.created_at.desc(), Order.id.desc())).all()
    return jsonify(orders=[o.to_dict() for o in orders]), 200


@orders_bp.get("/admin")
@admin_required
def all_orders_admin():
    orders = db.session.scalars(select(Order).order_by(Order.created_at.desc(), Order.id.desc())).all()
    return jsonify(orders=[o.to_dict() for o in orders], total=len(orders)), 200


@orders_bp.patch("/admin/<int:order_id>/payment-status")
@admin_required
def update_payment_status(order_id):
    order = db.session.get(Order, order_id)

    if order is None:
        return jsonify(error="Order not found."), 404

    data = request.get_json(silent=True) or {}
    payment_status = data.get("payment_status")

    # This action only confirms receipt of payment.
    if payment_status != "PAID":
        return jsonify(
            error="Only marking an order as PAID is supported."
        ), 400

    if order.payment_status == "PAID":
        return jsonify(
            message="This order is already marked as paid.",
            order=order.to_dict()
        ), 200

    try:
        order.payment_status = "PAID"
        db.session.commit()

        return jsonify(
            message="Payment marked as paid successfully.",
            order=order.to_dict()
        ), 200

    except Exception:
        db.session.rollback()
        current_app.logger.exception(
            "Failed to update payment status for order %s", order_id
        )
        return jsonify(
            error="Unable to update payment status. Please try again."
        ), 500
