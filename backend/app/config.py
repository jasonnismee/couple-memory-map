import os


class Settings:
    JWT_SECRET: str = os.environ.get("JWT_SECRET", "dev-secret-change-me")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 days

    DATABASE_URL: str = os.environ.get("DATABASE_URL", "")
    FRONTEND_URL: str = os.environ.get("FRONTEND_URL", "http://localhost:5173")

    UPLOAD_DIR: str = os.environ.get("UPLOAD_DIR", os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads"))

    GOOGLE_CLIENT_ID: str = os.environ.get("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.environ.get("GOOGLE_CLIENT_SECRET", "")


settings = Settings()
