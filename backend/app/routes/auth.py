
import hmac
from datetime import datetime, timezone

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    get_jwt,
    get_jwt_identity,
    jwt_required,
    set_refresh_cookies,
    unset_jwt_cookies,
)
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app import db
from app.models import User, RefreshToken

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def create_session_tokens(user):
    """Create tokens and record the refresh session in PostgreSQL."""
    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role},
    )
    refresh_token = create_refresh_token(
        identity=str(user.id),
        additional_claims={"role": user.role},
    )

    from flask_jwt_extended import decode_token

    claims = decode_token(refresh_token)
    expires_at = datetime.fromtimestamp(claims["exp"], tz=timezone.utc)

    db.session.add(
        RefreshToken(
            jti=claims["jti"],
            user_id=user.id,
            expires_at=expires_at,
        )
    )
    db.session.commit()

    return access_token, refresh_token


@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}

    full_name = data.get("full_name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not full_name or len(full_name) > 120:
        return jsonify(error="Enter a valid full name."), 400

    if not email or len(email) > 255 or "@" not in email:
        return jsonify(error="Enter a valid email address."), 400

    if not isinstance(password, str) or len(password) < 9:
        return jsonify(error="Password must be at least 9 characters."), 400

    if len(password) > 256:
        return jsonify(error="Password is too long."), 400

    if db.session.scalar(select(User).where(User.email == email)):
        return jsonify(error="An account with this email already exists."), 409

    user = User(full_name=full_name, email=email, role="CUSTOMER")
    user.set_password(password)

    try:
        db.session.add(user)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(error="An account with this email already exists."), 409

    return jsonify(
        message="Customer registered successfully.",
        user=user.to_dict(),
    ), 201


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    user = db.session.scalar(select(User).where(User.email == email))

    if (
        user is None
        or not isinstance(password, str)
        or not user.check_password(password)
        or not user.is_active
    ):
        return jsonify(error="Invalid email or password."), 401

    try:
        access_token, refresh_token = create_session_tokens(user)
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Failed to create login session")
        return jsonify(error="Unable to create a session."), 500

    response = jsonify(
        message="Login successful.",
        access_token=access_token,
        user=user.to_dict(),
    )
    set_refresh_cookies(response, refresh_token)
    return response, 200


@auth_bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    claims = get_jwt()
    old_jti = claims["jti"]

    old_session = db.session.scalar(
        select(RefreshToken).where(RefreshToken.jti == old_jti)
    )

    now = datetime.now(timezone.utc)

    if (
        old_session is None
        or old_session.revoked_at is not None
        or old_session.expires_at <= now
    ):
        return jsonify(error="Refresh session is invalid or expired."), 401

    user = db.session.get(User, int(get_jwt_identity()))

    if user is None or not user.is_active:
        return jsonify(error="Account is unavailable."), 401

    try:
        # Rotate the refresh token: the old one cannot be reused.
        old_session.revoked_at = now
        access_token, new_refresh_token = create_session_tokens(user)
        db.session.commit()
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Failed to rotate refresh token")
        return jsonify(error="Unable to refresh session."), 500

    response = jsonify(
        message="Token refreshed.",
        access_token=access_token,
    )
    set_refresh_cookies(response, new_refresh_token)
    return response, 200


@auth_bp.post("/logout")
@jwt_required(refresh=True)
def logout():
    claims = get_jwt()
    session = db.session.scalar(
        select(RefreshToken).where(RefreshToken.jti == claims["jti"])
    )

    if session is not None and session.revoked_at is None:
        session.revoked_at = datetime.now(timezone.utc)
        db.session.commit()

    response = jsonify(message="Logged out successfully.")
    unset_jwt_cookies(response)
    return response, 200


@auth_bp.get("/me")
@jwt_required()
def me():
    user = db.session.get(User, int(get_jwt_identity()))

    if user is None or not user.is_active:
        return jsonify(error="Account is unavailable."), 401

    return jsonify(user=user.to_dict()), 200


@auth_bp.post("/setup-admin")
def setup_admin():
    # Only the first administrator can be created by this endpoint.
    secret = current_app.config.get("ADMIN_SETUP_SECRET", "")
    supplied_secret = request.headers.get("X-Admin-Setup-Secret", "")

    if not secret or not hmac.compare_digest(supplied_secret, secret):
        return jsonify(error="Invalid setup credentials."), 403

    existing_admin = db.session.scalar(
        select(User.id).where(User.role == "ADMIN").limit(1)
    )

    if existing_admin is not None:
        return jsonify(error="Administrator setup is already complete."), 409

    data = request.get_json(silent=True) or {}

    full_name = data.get("full_name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not full_name or len(full_name) > 120:
        return jsonify(error="Enter a valid full name."), 400

    if not email or len(email) > 255 or "@" not in email:
        return jsonify(error="Enter a valid email address."), 400

    if not isinstance(password, str) or len(password) < 9:
        return jsonify(error="Password must be at least 9 characters."), 400

    if len(password) > 256:
        return jsonify(error="Password is too long."), 400

    if db.session.scalar(select(User).where(User.email == email)):
        return jsonify(error="An account with this email already exists."), 409

    admin = User(full_name=full_name, email=email, role="ADMIN")
    admin.set_password(password)

    try:
        db.session.add(admin)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(error="An account with this email already exists."), 409

    return jsonify(
        message="Administrator created successfully.",
        user=admin.to_dict(),
    ), 201

@auth_bp.get("/admin-check")
@jwt_required()
def admin_check():
    claims = get_jwt()

    if claims.get("role") != "ADMIN":
        return jsonify(error="Administrator access required."), 403

    user = db.session.get(User, int(get_jwt_identity()))

    if user is None or not user.is_active or user.role != "ADMIN":
        return jsonify(error="Administrator access required."), 403

    return jsonify(message="Admin authorization successful."), 200
