from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token, get_current_user
from app.models.user import User
from app.models.analysis import AuditLog
from app.schemas.schemas import UserRegister, Token, UserOut, JiraConfig

router = APIRouter(prefix="/api/auth", tags=["auth"])


def log_action(db: Session, user_id: int, action: str, detail: str = "", ip: str = ""):
    log = AuditLog(user_id=user_id, action=action, detail=detail, ip_address=ip)
    db.add(log)
    db.commit()


@router.post("/register", response_model=UserOut)
def register(user_data: UserRegister, request: Request, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=get_password_hash(user_data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    log_action(db, user.id, "REGISTER", f"New user: {user.email}", request.client.host)
    return user


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), request: Request = None, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    user.last_login = datetime.utcnow()
    db.commit()

    token = create_access_token({"sub": str(user.id)})
    log_action(db, user.id, "LOGIN", f"Login from {request.client.host if request else 'unknown'}")

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "is_admin": user.is_admin,
            "jira_base_url": user.jira_base_url,
            "jira_email": user.jira_email,
            "jira_api_token": user.jira_api_token,
        },
    }


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/jira-config", response_model=UserOut)
def save_jira_config(
    config: JiraConfig,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    print(f"DEBUG: Saving Jira config for user {current_user.id}: {config}")
    current_user.jira_base_url = config.jira_base_url
    current_user.jira_email = config.jira_email
    current_user.jira_api_token = config.jira_api_token
    db.commit()
    db.refresh(current_user)
    print(f"DEBUG: Saved Jira config: {current_user.jira_base_url}, {current_user.jira_email}")
    return current_user
