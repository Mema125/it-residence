from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.database import get_db
from app.deps import get_current_user
from app.routers.classes import _get_membership, _require_member

router = APIRouter(tags=["assessments"])

# Keys inside an exercise's `data` that reveal the correct answer and must
# never be sent to a student taking the assessment.
_ANSWER_KEY_FIELDS = {
    models.ExerciseType.QCM: ["correct_indices"],
    models.ExerciseType.FILL_BLANK: ["answers"],
    models.ExerciseType.MATCHING: ["correct_map"],
    models.ExerciseType.FREE_RESPONSE: [],
    models.ExerciseType.REDACTION: [],
}


def _strip_answer_key(exercise: models.Exercise) -> dict:
    hidden_fields = _ANSWER_KEY_FIELDS.get(exercise.type, [])
    return {k: v for k, v in exercise.data.items() if k not in hidden_fields}


def _require_teacher_of_class(db: Session, class_id: str, user: models.User) -> None:
    membership = _get_membership(db, class_id, user.id)
    if membership is None or membership.role_in_class != models.ClassRole.TEACHER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Réservé au professeur de la classe")


def _get_assessment_or_404(db: Session, assessment_id: str) -> models.Assessment:
    assessment = db.get(models.Assessment, assessment_id)
    if assessment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Évaluation introuvable")
    return assessment


@router.post(
    "/classes/{class_id}/assessments",
    response_model=schemas.AssessmentOut,
    status_code=status.HTTP_201_CREATED,
)
def create_assessment(
    class_id: str,
    payload: schemas.AssessmentCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    _require_teacher_of_class(db, class_id, user)
    if payload.start_mode == models.StartMode.FIXED and payload.fixed_start_at is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Une heure de début est requise en mode planifié",
        )

    assessment = models.Assessment(
        class_id=class_id,
        title=payload.title,
        description=payload.description,
        created_by=user.id,
        start_mode=payload.start_mode,
        fixed_start_at=payload.fixed_start_at,
        duration_minutes=payload.duration_minutes,
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return assessment


@router.get("/classes/{class_id}/assessments", response_model=list[schemas.AssessmentOut])
def list_assessments(
    class_id: str, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)
):
    _require_member(db, class_id, user)
    return db.query(models.Assessment).filter(models.Assessment.class_id == class_id).all()


@router.get("/assessments/{assessment_id}", response_model=schemas.AssessmentDetailOut)
def get_assessment(
    assessment_id: str, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)
):
    assessment = (
        db.query(models.Assessment)
        .options(joinedload(models.Assessment.exercises))
        .filter(models.Assessment.id == assessment_id)
        .first()
    )
    if assessment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Évaluation introuvable")

    membership = _require_member(db, assessment.class_id, user)

    result = schemas.AssessmentDetailOut.model_validate(assessment)
    if membership.role_in_class == models.ClassRole.STUDENT:
        result.exercises = [
            schemas.ExerciseOut(
                id=ex.id,
                assessment_id=ex.assessment_id,
                order=ex.order,
                type=ex.type,
                prompt=ex.prompt,
                points=ex.points,
                data=_strip_answer_key(ex),
            )
            for ex in assessment.exercises
        ]
    return result


@router.post(
    "/assessments/{assessment_id}/exercises",
    response_model=schemas.ExerciseOut,
    status_code=status.HTTP_201_CREATED,
)
def add_exercise(
    assessment_id: str,
    payload: schemas.ExerciseCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    assessment = _get_assessment_or_404(db, assessment_id)
    _require_teacher_of_class(db, assessment.class_id, user)

    exercise = models.Exercise(
        assessment_id=assessment_id,
        order=payload.order,
        type=payload.type,
        prompt=payload.prompt,
        points=payload.points,
        data=payload.data,
    )
    db.add(exercise)
    db.commit()
    db.refresh(exercise)
    return exercise


@router.delete("/exercises/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_exercise(
    exercise_id: str, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)
):
    exercise = db.get(models.Exercise, exercise_id)
    if exercise is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercice introuvable")
    assessment = _get_assessment_or_404(db, exercise.assessment_id)
    _require_teacher_of_class(db, assessment.class_id, user)
    db.delete(exercise)
    db.commit()
