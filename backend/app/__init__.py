
from datetime import datetime, timezone

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from sqlalchemy import select

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()


def create_app():
    app = Flask(__name__)
    app.config.from_object("config.Config")
    app.config["MAX_CONTENT_LENGTH"] = 6 * 1024 * 1024

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    CORS(
        app,
        origins=[app.config.get("FRONTEND_URL", "http://localhost:5173")],
        supports_credentials=True,
        allow_headers=[
            "Content-Type",
            "Authorization",
            "X-CSRF-TOKEN",
        ],
        methods=[
            "GET", "POST", "PUT", "PATCH",
            "DELETE", "OPTIONS",
        ],
    )

    # Import models after initializing the database extension.
    from app.models import User, RefreshToken, Product

    @jwt.token_in_blocklist_loader
    def is_token_revoked(jwt_header, jwt_payload):
        if jwt_payload.get("type") != "refresh":
            return False

        session = db.session.scalar(
            select(RefreshToken).where(
                RefreshToken.jti == jwt_payload["jti"]
            )
        )

        if session is None or session.revoked_at is not None:
            return True

        return session.expires_at <= datetime.now(timezone.utc)

    # Import and register routes only after db and models are ready.
    from app.routes.auth import auth_bp
    from app.routes.products import products_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(products_bp)

    @app.get("/api/health")
    def health():
        return {
            "status": "ok",
            "message": "Dairy Marketplace API is running",
        }

    @app.get("/api/health/database")
    def database_health():
        from sqlalchemy import text

        with db.engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {"status": "ok", "database": "connected"}
    from app.routes.orders import orders_bp
    app.register_blueprint(orders_bp)
    from app.routes.assistant import assistant_bp
    app.register_blueprint(assistant_bp)

    return app
