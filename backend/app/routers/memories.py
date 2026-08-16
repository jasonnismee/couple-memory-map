from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session, joinedload
from ..auth import get_current_user
from ..database import get_db
from ..models import Couple, Memory, MemoryPhoto, User
from ..schemas import MemoryIn, MemoryOut, MemoryUpdate
from ..storage import drive_storage, local_storage, photo_url_prefix

router = APIRouter(prefix="/api/memories", tags=["memories"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB per photo


def memory_out(m: Memory) -> dict:
    prefix = photo_url_prefix()
    return {
        "id": m.id,
        "title": m.title,
        "description": m.description,
        "date": m.date,
        "latitude": m.latitude,
        "longitude": m.longitude,
        "location_name": m.location_name,
        "category": m.category,
        "created_by": m.created_by,
        "created_by_name": m.author.name if m.author else None,
        "created_at": m.created_at,
        "updated_at": m.updated_at,
        "photos": [
            {
                "id": p.id,
                # Drive URLs are absolute; local uploads get the backend origin.
                "image_url": p.image_url if p.image_url.startswith("http") else prefix + p.image_url,
            }
            for p in m.photos
        ],
    }


def get_owned(memory_id: int, user: User, db: Session) -> Memory:
    m = db.get(Memory, memory_id, options=[joinedload(Memory.photos)])
    if m is None or m.couple_id != user.couple_id:
        raise HTTPException(404, "Memory not found.")
    return m


@router.get("")
def list_memories(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = (
        db.query(Memory)
        .options(joinedload(Memory.photos), joinedload(Memory.author))
        .filter(Memory.couple_id == user.couple_id)
        .order_by(Memory.created_at.desc())
        .all()
    )
    return [memory_out(m) for m in items]


@router.post("", response_model=MemoryOut, status_code=201)
def create_memory(body: MemoryIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = Memory(
        couple_id=user.couple_id,
        title=body.title,
        description=body.description,
        date=body.date,
        latitude=body.latitude,
        longitude=body.longitude,
        location_name=body.location_name,
        category=body.category,
        created_by=user.id,
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return memory_out(m)


@router.get("/{memory_id}", response_model=MemoryOut)
def get_memory(memory_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return memory_out(get_owned(memory_id, user, db))


@router.put("/{memory_id}", response_model=MemoryOut)
def update_memory(
    memory_id: int,
    body: MemoryUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    m = get_owned(memory_id, user, db)
    m.title = body.title
    m.description = body.description
    m.date = body.date
    m.latitude = body.latitude
    m.longitude = body.longitude
    m.location_name = body.location_name
    m.category = body.category
    db.commit()
    db.refresh(m)
    return memory_out(m)


@router.delete("/{memory_id}", status_code=204)
def delete_memory(memory_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = get_owned(memory_id, user, db)
    couple = db.get(Couple, user.couple_id)
    for p in m.photos:
        _delete_photo_file(p.image_url, couple)
    db.delete(m)
    db.commit()


@router.post("/{memory_id}/photos", status_code=201)
def upload_photos(
    memory_id: int,
    files: list[UploadFile] = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    m = get_owned(memory_id, user, db)
    couple = db.get(Couple, user.couple_id)
    use_drive = bool(couple.drive_refresh_token)
    saved = []
    for f in files:
        content = f.file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(400, f"{f.filename} is larger than 10 MB.")
        if use_drive:
            url = drive_storage.save(m.id, content, f.content_type or "", couple.drive_refresh_token)
        else:
            url = local_storage.save(m.id, content, f.content_type or "")
        photo = MemoryPhoto(memory_id=m.id, image_url=url)
        db.add(photo)
        saved.append(photo)
    db.commit()
    return [
        {
            "id": p.id,
            "image_url": p.image_url if p.image_url.startswith("http") else photo_url_prefix() + p.image_url,
        }
        for p in saved
    ]


@router.delete("/{memory_id}/photos/{photo_id}", status_code=204)
def delete_photo(
    memory_id: int,
    photo_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    m = get_owned(memory_id, user, db)
    photo = db.get(MemoryPhoto, photo_id)
    if photo is None or photo.memory_id != m.id:
        raise HTTPException(404, "Photo not found.")
    couple = db.get(Couple, user.couple_id)
    _delete_photo_file(photo.image_url, couple)
    db.delete(photo)
    db.commit()


def _delete_photo_file(url: str, couple: Couple | None):
    try:
        if url.startswith("http") and couple and couple.drive_refresh_token:
            drive_storage.delete(url, couple.drive_refresh_token)
        elif not url.startswith("http"):
            local_storage.delete(url)
    except Exception:
        # Photo file cleanup is best-effort; the DB record is removed regardless.
        pass
