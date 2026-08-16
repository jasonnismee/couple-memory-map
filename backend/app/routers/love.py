from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from ..auth import get_current_user
from ..database import get_db
from ..models import Couple, LoveRequest, Memory, User
from ..schemas import LoveRequestCreate, LoveRequestOut

router = APIRouter(prefix="/api/love-requests", tags=["love-requests"])


def _out(r: LoveRequest) -> dict:
    return {
        "id": r.id,
        "from_user_id": r.from_user_id,
        "from_user_name": r.from_user.name if r.from_user else "Someone",
        "to_email": r.to_email,
        "status": r.status,
        "created_at": r.created_at,
    }


@router.post("", response_model=LoveRequestOut, status_code=201)
def send_request(body: LoveRequestCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    couple = db.get(Couple, user.couple_id)
    if couple.partner2_id is not None:
        raise HTTPException(400, "You are already sharing your map with someone 💕")
    if body.to_email.lower() == user.email.lower():
        raise HTTPException(400, "You can't send a love request to yourself 😄")

    target = db.query(User).filter(User.email == body.to_email.lower()).first()
    if target:
        if target.couple.partner2_id is not None:
            raise HTTPException(400, "That person is already paired with someone else.")
        pending_to_them = (
            db.query(LoveRequest)
            .filter(LoveRequest.to_email == body.to_email.lower(), LoveRequest.status == "pending")
            .first()
        )
        if pending_to_them:
            raise HTTPException(400, "There is already a pending request for that email.")

    existing = (
        db.query(LoveRequest)
        .filter(
            LoveRequest.couple_id == couple.id,
            LoveRequest.to_email == body.to_email.lower(),
            LoveRequest.status == "pending",
        )
        .first()
    )
    if existing:
        raise HTTPException(400, "You already sent a request to this email.")

    r = LoveRequest(couple_id=couple.id, from_user_id=user.id, to_email=body.to_email.lower())
    db.add(r)
    db.commit()
    db.refresh(r)
    return _out(r)


@router.get("/incoming", response_model=list[LoveRequestOut])
def incoming(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    reqs = (
        db.query(LoveRequest)
        .options(joinedload(LoveRequest.from_user))
        .filter(LoveRequest.to_email == user.email.lower(), LoveRequest.status == "pending")
        .all()
    )
    return [_out(r) for r in reqs]


@router.get("/sent", response_model=list[LoveRequestOut])
def sent(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    reqs = (
        db.query(LoveRequest)
        .options(joinedload(LoveRequest.from_user))
        .filter(LoveRequest.couple_id == user.couple_id, LoveRequest.status == "pending")
        .all()
    )
    return [_out(r) for r in reqs]


def _get_pending(request_id: int, user: User, db: Session) -> LoveRequest:
    r = db.get(LoveRequest, request_id)
    if r is None or r.status != "pending" or r.to_email.lower() != user.email.lower():
        raise HTTPException(404, "Request not found.")
    return r


@router.post("/{request_id}/accept", response_model=LoveRequestOut)
def accept(request_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    r = _get_pending(request_id, user, db)
    couple = db.get(Couple, r.couple_id)  # sender's couple
    if couple.partner2_id is not None:
        raise HTTPException(409, "They are already paired with someone else.")
    if user.id == couple.partner1_id:
        raise HTTPException(400, "You can't accept your own request.")

    old_couple = db.get(Couple, user.couple_id)
    # Bring B's existing memories into the shared map, then retire B's old couple.
    # Core SQL keeps the flush order deterministic so the FK constraints hold.
    from sqlalchemy import delete as sa_delete
    from sqlalchemy import update as sa_update

    db.execute(sa_update(Memory).where(Memory.couple_id == old_couple.id).values(couple_id=couple.id))
    db.execute(sa_update(Couple).where(Couple.id == couple.id).values(partner2_id=user.id))
    db.execute(sa_update(User).where(User.id == user.id).values(couple_id=couple.id))
    r.status = "accepted"
    if old_couple.id != couple.id:
        db.execute(sa_delete(Couple).where(Couple.id == old_couple.id))
    db.commit()
    db.expire_all()
    db.refresh(r)
    return _out(r)


@router.post("/{request_id}/decline", response_model=LoveRequestOut)
def decline(request_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    r = _get_pending(request_id, user, db)
    r.status = "declined"
    db.commit()
    db.refresh(r)
    return _out(r)
