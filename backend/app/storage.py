"""Modular photo storage.

LocalStorage keeps files on disk (dev). DriveStorage uploads to the couple's
Google Drive via OAuth (prod). Swap by setting the relevant env vars.
"""
import mimetypes
import os
import secrets
import string
from fastapi import HTTPException

from .config import settings

ALLOWED_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}


def check_image(content_type: str) -> str:
    ext = ALLOWED_TYPES.get(content_type)
    if not ext:
        raise HTTPException(400, f"Unsupported image type: {content_type or 'unknown'}. Use JPG, PNG or WEBP.")
    return ext


def random_name(ext: str) -> str:
    alphabet = string.ascii_lowercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(16)) + ext


class LocalStorage:
    """Stores files under UPLOAD_DIR/memories/{memory_id}/ and serves them via /uploads."""

    def save(self, memory_id: int, content: bytes, content_type: str) -> str:
        ext = check_image(content_type)
        folder = os.path.join(settings.UPLOAD_DIR, "memories", str(memory_id))
        os.makedirs(folder, exist_ok=True)
        name = random_name(ext)
        with open(os.path.join(folder, name), "wb") as f:
            f.write(content)
        return f"/uploads/memories/{memory_id}/{name}"

    def delete(self, url: str) -> None:
        if not url.startswith("/uploads/"):
            return
        path = os.path.join(settings.UPLOAD_DIR, url[len("/uploads/"):].replace("/", os.sep))
        if os.path.isfile(path):
            os.remove(path)


class DriveStorage:
    """Uploads photos to the couple's Google Drive folder using their refresh token."""

    AUTH_URL = "https://oauth2.googleapis.com/token"
    UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files"
    FOLDER_NAME = "Couple Memory Map"

    def _access_token(self, refresh_token: str) -> str:
        import httpx

        res = httpx.post(
            self.AUTH_URL,
            data={
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
            timeout=15,
        )
        res.raise_for_status()
        return res.json()["access_token"]

    def _folder_id(self, headers: dict) -> str:
        import httpx

        res = httpx.get(
            "https://www.googleapis.com/drive/v3/files",
            params={"q": f"name='{self.FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false", "fields": "files(id)"},
            headers=headers,
            timeout=15,
        )
        res.raise_for_status()
        files = res.json().get("files", [])
        if files:
            return files[0]["id"]
        res = httpx.post(
            "https://www.googleapis.com/drive/v3/files",
            json={"name": self.FOLDER_NAME, "mimeType": "application/vnd.google-apps.folder"},
            headers=headers,
            timeout=15,
        )
        res.raise_for_status()
        return res.json()["id"]

    def save(self, memory_id: int, content: bytes, content_type: str, refresh_token: str) -> str:
        import httpx

        ext = check_image(content_type)
        token = self._access_token(refresh_token)
        headers = {"Authorization": f"Bearer {token}"}
        folder_id = self._folder_id(headers)
        res = httpx.post(
            self.UPLOAD_URL,
            params={"uploadType": "multipart", "fields": "id"},
            headers=headers,
            files={
                "metadata": (None, f'{{"name": "memory-{memory_id}-{random_name(ext)}", "parents": ["{folder_id}"]}}', "application/json"),
                "file": ("photo" + ext, content, content_type),
            },
            timeout=60,
        )
        res.raise_for_status()
        file_id = res.json()["id"]
        # Make it viewable by anyone with the link, then use the thumbnail endpoint.
        httpx.post(
            f"https://www.googleapis.com/drive/v3/files/{file_id}/permissions",
            json={"role": "reader", "type": "anyone"},
            headers=headers,
            timeout=15,
        )
        return f"https://drive.google.com/thumbnail?id={file_id}&sz=w1200"

    def delete(self, url: str, refresh_token: str) -> None:
        import httpx

        if "id=" not in url:
            return
        file_id = url.split("id=")[1].split("&")[0]
        token = self._access_token(refresh_token)
        httpx.delete(
            f"https://www.googleapis.com/drive/v3/files/{file_id}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=15,
        )


local_storage = LocalStorage()
drive_storage = DriveStorage()


def photo_url_prefix() -> str:
    """Absolute URL prefix for locally stored files."""
    return os.environ.get("PUBLIC_BASE_URL", "")
