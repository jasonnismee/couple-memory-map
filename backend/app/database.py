from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from .config import settings

if settings.DATABASE_URL:
    # Postgres (Neon etc.) — use a connection pool friendly to serverless hosts.
    url = settings.DATABASE_URL.replace("postgres://", "postgresql://")
    engine = create_engine(url, pool_pre_ping=True)
else:
    # Local dev fallback: SQLite
    engine = create_engine("sqlite:///./couple_memory_map.db", connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
