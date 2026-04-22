from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import get_current_admin
from app.models.user import User
from app.models.analysis import Analysis, AuditLog
from app.schemas.schemas import UserOut, AuditLogOut

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    return db.query(User).order_by(User.created_at.desc()).all()


@router.put("/users/{user_id}/toggle-active")
def toggle_user_active(user_id: int, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
    user.is_active = not user.is_active
    db.commit()
    return {"message": f"User {'activated' if user.is_active else 'deactivated'}", "is_active": user.is_active}


@router.put("/users/{user_id}/toggle-admin")
def toggle_admin(user_id: int, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_admin = not user.is_admin
    db.commit()
    return {"message": f"Admin {'granted' if user.is_admin else 'revoked'}", "is_admin": user.is_admin}


@router.get("/audit-logs", response_model=List[AuditLogOut])
def get_audit_logs(
    limit: int = 100,
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()


@router.get("/stats")
def get_stats(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    total_analyses = db.query(Analysis).count()
    powerbi_synced = db.query(Analysis).filter(Analysis.powerbi_synced == True).count()
    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_analyses": total_analyses,
        "powerbi_synced": powerbi_synced,
    }
