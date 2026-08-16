from datetime import date as Date, datetime
from pydantic import BaseModel, EmailStr, Field


class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6)
    invite_code: str | None = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    avatar_url: str | None
    couple_id: int
    partner_name: str | None
    invite_code: str
    drive_connected: bool


class AuthOut(BaseModel):
    token: str
    user: UserOut


class MemoryIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    date: Date | None = None
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    location_name: str | None = None
    category: str | None = None


class MemoryUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    date: Date | None = None
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    location_name: str | None = None
    category: str | None = None


class PhotoOut(BaseModel):
    id: int
    image_url: str


class MemoryOut(BaseModel):
    id: int
    title: str
    description: str | None
    date: Date | None
    latitude: float
    longitude: float
    location_name: str | None
    category: str | None
    created_by: int
    created_by_name: str | None
    created_at: datetime
    updated_at: datetime
    photos: list[PhotoOut]


class LoveRequestCreate(BaseModel):
    to_email: EmailStr


class LoveRequestOut(BaseModel):
    id: int
    from_user_id: int
    from_user_name: str
    to_email: str
    status: str
    created_at: datetime
