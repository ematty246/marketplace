from datetime import datetime, timezone
from app import db

class Order(db.Model):
    __tablename__ = "orders"
    id = db.Column(db.Integer, primary_key=True)
    order_number = db.Column(db.String(36), unique=True, nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    total_amount = db.Column(db.Numeric(10, 2), nullable=False)
    payment_method = db.Column(db.String(20), nullable=False, default="COD")
    payment_status = db.Column(db.String(20), nullable=False, default="UNPAID")
    order_status = db.Column(db.String(20), nullable=False, default="PLACED")
    shipping_address = db.Column(db.String(500), nullable=False)
    # Nullable for existing historical orders; new orders require phone_number in the API.
    phone_number = db.Column(db.String(25), nullable=True)
    latitude = db.Column(db.Numeric(10, 7), nullable=True)
    longitude = db.Column(db.Numeric(10, 7), nullable=True)
    google_maps_url = db.Column(db.String(1000), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    customer = db.relationship("User", backref=db.backref("orders", lazy=True))
    items = db.relationship("OrderItem", back_populates="order", lazy=True, cascade="all, delete-orphan", order_by="OrderItem.id")

    def to_dict(self):
        return {
            "id": self.id, "order_number": self.order_number, "user_id": self.user_id,
            "customer_name": self.customer.full_name if self.customer else None,
            "customer_email": self.customer.email if self.customer else None,
            "phone_number": self.phone_number,
            "items": [item.to_dict() for item in self.items],
            "total_amount": float(self.total_amount), "payment_method": self.payment_method,
            "payment_status": self.payment_status, "order_status": self.order_status,
            "shipping_address": self.shipping_address,
            "latitude": float(self.latitude) if self.latitude is not None else None,
            "longitude": float(self.longitude) if self.longitude is not None else None,
            "google_maps_url": self.google_maps_url,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

class OrderItem(db.Model):
    __tablename__ = "order_items"
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True)
    product_name = db.Column(db.String(120), nullable=False)
    unit = db.Column(db.String(30), nullable=False)
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    line_total = db.Column(db.Numeric(10, 2), nullable=False)
    order = db.relationship("Order", back_populates="items")
    product = db.relationship("Product")

    def to_dict(self):
        return {"id": self.id, "product_id": self.product_id, "product_name": self.product_name,
                "unit": self.unit, "unit_price": float(self.unit_price), "quantity": self.quantity,
                "line_total": float(self.line_total)}
