import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..auth import create_token, get_current_user, hash_password, user_to_dict, verify_password
from ..database import get_db
from ..models import Couple, User
from ..schemas import AuthOut, LoginIn, RegisterIn

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _invite_code() -> str:
    return "".join(secrets.choice("ABCDEFGHJKMNPQRSTUVWXYZ23456789") for _ in range(8))


@router.post("/register", response_model=AuthOut)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(400, "An account with this email already exists.")

    join_couple = None
    if body.invite_code:
        join_couple = db.query(Couple).filter(Couple.invite_code == body.invite_code.strip().upper()).first()
        if not join_couple:
            raise HTTPException(400, "Invalid invite code.")
        if join_couple.partner2_id is not None:
            raise HTTPException(400, "This couple already has two partners.")

    if join_couple:
        couple = join_couple
        user = User(name=body.name, email=body.email, password_hash=hash_password(body.password), couple_id=couple.id)
        db.add(user)
        db.flush()
        couple.partner2_id = user.id
    else:
        couple = Couple(invite_code=_invite_code())
        db.add(couple)
        db.flush()
        user = User(name=body.name, email=body.email, password_hash=hash_password(body.password), couple_id=couple.id)
        db.add(user)
        db.flush()
        couple.partner1_id = user.id

    db.commit()
    db.refresh(user)
    return {"token": create_token(user.id), "user": user_to_dict(user, db)}


@router.post("/login", response_model=AuthOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Incorrect email or password.")
    return {"token": create_token(user.id), "user": user_to_dict(user, db)}


@router.get("/me")
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return user_to_dict(user, db)
