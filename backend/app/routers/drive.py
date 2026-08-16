"""Google Drive OAuth: lets a couple connect their Drive for photo storage."""
import secrets
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..config import settings
from ..database import get_db
from ..models import User

router = APIRouter(prefix="/api/drive", tags=["drive"])

SCOPES = "https://www.googleapis.com/auth/drive.file"

# In-memory state store is enough: the redirect happens seconds after connect.
_states: dict[str, int] = {}


@router.get("/connect")
def connect(user: User = Depends(get_current_user)):
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(400, "Google Drive is not configured on this server.")
    state = secrets.token_urlsafe(24)
    _states[state] = user.id
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

    user_id = _states.pop(state, None)
    if user_id is None:
        raise HTTPException(400, "Unknown or expired OAuth state. Please try connecting again.")
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
