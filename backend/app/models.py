from datetime import date, datetime, timezone
from sqlalchemy import Integer, String, Float, Text, Date, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    couple_id: Mapped[int] = mapped_column(ForeignKey("couples.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    couple = relationship(
        "Couple",
        back_populates="members",
        primaryjoin="User.couple_id == Couple.id",
        foreign_keys=[couple_id],
    )


class Couple(Base):
    __tablename__ = "couples"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Nullable at insert time: a new couple is created before its first user is flushed.
    partner1_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    partner2_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    invite_code: Mapped[str] = mapped_column(String(12), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    members = relationship("User", back_populates="couple", foreign_keys=[User.couple_id])
    memories = relationship("Memory", back_populates="couple", cascade="all, delete-orphan")
    drive_refresh_token: Mapped[str | None] = mapped_column(Text, nullable=True)


class Memory(Base):
    __tablename__ = "memories"

    id: Mapped[int] = mapped_column(primary_key=True)
    couple_id: Mapped[int] = mapped_column(ForeignKey("couples.id"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    date: Mapped[date | None] = mapped_column(Date, nullable=True)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    location_name: Mapped[str | None] = mapped_column(String(300), nullable=True)
    category: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    couple = relationship("Couple", back_populates="memories")
    author = relationship("User", foreign_keys=[created_by])
    photos = relationship("MemoryPhoto", back_populates="memory", cascade="all, delete-orphan")


class MemoryPhoto(Base):
    __tablename__ = "memory_photos"

    id: Mapped[int] = mapped_column(primary_key=True)
    memory_id: Mapped[int] = mapped_column(ForeignKey("memories.id"), index=True)
    image_url: Mapped[str] = mapped_column(String(1000))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    memory = relationship("Memory", back_populates="photos")


class LoveRequest(Base):
    __tablename__ = "love_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    couple_id: Mapped[int] = mapped_column(ForeignKey("couples.id"), index=True)
    from_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    to_email: Mapped[str] = mapped_column(String(255), index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending/accepted/declined
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    from_user = relationship("User", foreign_keys=[from_user_id])
