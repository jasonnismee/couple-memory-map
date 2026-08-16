"""Google Drive OAuth: lets a couple connect their Drive for photo storage."""
import hmac
import secrets
from hashlib import sha256
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..config import settings
from ..database import get_db
from ..models import User

router = APIRouter(prefix="/api/drive", tags=["drive"])

SCOPES = "https://www.googleapis.com/auth/drive.file"


def _sign(user_id: int) -> str:
    mac = hmac.new(settings.JWT_SECRET.encode(), f"drive:{user_id}".encode(), sha256).hexdigest()[:32]
    return f"{user_id}.{mac}"


def _verify(state: str) -> int:
    user_id, _, mac = state.partition(".")
    expected = hmac.new(settings.JWT_SECRET.encode(), f"drive:{user_id}".encode(), sha256).hexdigest()[:32]
    if not hmac.compare_digest(mac, expected):
        raise HTTPException(400, "Invalid OAuth state. Please try connecting again.")
    return int(user_id)


@router.get("/connect")
def connect(request: Request, user: User = Depends(get_current_user)):
    # The frontend links here as a full navigation, so the JWT may arrive as
    # ?token= instead of the Authorization header.
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(400, "Google Drive is not configured on this server. Set GOOGLE_CLIENT_ID/SECRET.")
    state = _sign(user.id)
    params = urlencode(
        {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": settings.FRONTEND_URL.rstrip("/") + "/api/drive/callback",
            "response_type": "code",
            "scope": SCOPES,
            "access_type": "offline",
            "prompt": "consent",
            "state": state,
        }
    )
    return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{params}")


@router.get("/callback")
def callback(code: str = "", state: str = "", error: str = ""):
    from ..database import SessionLocal

    user_id = _verify(state)
    if error or not code:
        raise HTTPException(400, f"Google Drive connection failed: {error or 'no code'}")

    res = httpx.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.FRONTEND_URL.rstrip("/") + "/api/drive/callback",
            "grant_type": "authorization_code",
        },
        timeout=15,
    )
    res.raise_for_status()
    refresh_token = res.json().get("refresh_token")
    if not refresh_token:
        raise HTTPException(400, "Google did not return a refresh token. Revoke the app in your Google account and retry.")

    db: Session = SessionLocal()
    try:
        user = db.get(User, user_id)
        user.couple.drive_refresh_token = refresh_token
        db.commit()
    finally:
        db.close()
    return RedirectResponse(url="/?drive=connected")


@router.post("/disconnect", status_code=204)
def disconnect(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user.couple.drive_refresh_token = None
    db.commit()
