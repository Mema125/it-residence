from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.database import get_db
from app.deps import get_current_user, require_teacher

router = APIRouter(tags=["classes"])


def _get_membership(db: Session, class_id: str, user_id: str) -> models.ClassMembership | None:
    return (
        db.query(models.ClassMembership)
        .filter(models.ClassMembership.class_id == class_id, models.ClassMembership.user_id == user_id)
        .first()
    )


def _require_member(db: Session, class_id: str, user: models.User) -> models.ClassMembership:
    membership = _get_membership(db, class_id, user.id)
    if membership is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vous n'êtes pas membre de cette classe")
    return membership


@router.post("/classes", response_model=schemas.ClassOut, status_code=status.HTTP_201_CREATED)
def create_class(
    payload: schemas.ClassCreate,
    db: Session = Depends(get_db),
    teacher: models.User = Depends(require_teacher),
):
    class_room = models.ClassRoom(name=payload.name, teacher_id=teacher.id)
    db.add(class_room)
    db.flush()

    membership = models.ClassMembership(
        class_id=class_room.id, user_id=teacher.id, role_in_class=models.ClassRole.TEACHER
    )
    db.add(membership)
    db.commit()
    db.refresh(class_room)
    return class_room


@router.get("/classes", response_model=list[schemas.ClassOut])
def list_my_classes(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return (
        db.query(models.ClassRoom)
        .join(models.ClassMembership)
        .filter(models.ClassMembership.user_id == user.id)
        .all()
    )


@router.get("/classes/{class_id}", response_model=schemas.ClassDetailOut)
def get_class(class_id: str, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    _require_member(db, class_id, user)
    class_room = (
        db.query(models.ClassRoom)
        .options(joinedload(models.ClassRoom.memberships).joinedload(models.ClassMembership.user))
        .filter(models.ClassRoom.id == class_id)
        .first()
    )
    if class_room is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classe introuvable")
    return class_room


@router.post("/classes/{class_id}/invites", response_model=schemas.InviteOut, status_code=status.HTTP_201_CREATED)
def create_invite(
    class_id: str,
    payload: schemas.InviteCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    membership = _require_member(db, class_id, user)

    if payload.role_to_grant == models.InviteTargetRole.CLASS_LEADER:
        if membership.role_in_class != models.ClassRole.TEACHER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Seul le professeur peut désigner un chef de classe",
            )
        if not payload.target_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Un email est requis pour désigner un chef de classe précis",
            )
    else:  # STUDENT invite: teacher or class leader can generate a shareable link
        if membership.role_in_class not in (models.ClassRole.TEACHER, models.ClassRole.CLASS_LEADER):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Seuls le professeur ou le chef de classe peuvent inviter des élèves",
            )

    invite = models.ClassInvite(
        class_id=class_id,
        role_to_grant=payload.role_to_grant,
        created_by=user.id,
        target_email=payload.target_email,
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)
    return invite


@router.get("/invites/{token}", response_model=schemas.InvitePreview)
def preview_invite(token: str, db: Session = Depends(get_db)):
    invite = db.query(models.ClassInvite).filter(models.ClassInvite.token == token).first()
    if invite is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation introuvable")
    class_room = db.get(models.ClassRoom, invite.class_id)
    already_used = invite.role_to_grant == models.InviteTargetRole.CLASS_LEADER and invite.used_by is not None
    return schemas.InvitePreview(
        class_id=class_room.id,
        class_name=class_room.name,
        role_to_grant=invite.role_to_grant,
        already_used=already_used,
    )


@router.post("/invites/{token}/accept", response_model=schemas.MembershipOut)
def accept_invite(token: str, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    invite = db.query(models.ClassInvite).filter(models.ClassInvite.token == token).first()
    if invite is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation introuvable")

    if invite.role_to_grant == models.InviteTargetRole.CLASS_LEADER:
        if invite.used_by is not None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cette invitation a déjà été utilisée")
        assigned_role = models.ClassRole.CLASS_LEADER
    else:
        assigned_role = models.ClassRole.STUDENT

    if _get_membership(db, invite.class_id, user.id) is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Vous êtes déjà membre de cette classe")

    membership = models.ClassMembership(
        class_id=invite.class_id,
        user_id=user.id,
        role_in_class=assigned_role,
        invited_by=invite.created_by,
    )
    db.add(membership)

    if invite.role_to_grant == models.InviteTargetRole.CLASS_LEADER:
        from datetime import datetime

        invite.used_by = user.id
        invite.used_at = datetime.utcnow()

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Vous êtes déjà membre de cette classe")

    db.refresh(membership)
    return membership
