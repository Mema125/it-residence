from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.database import get_db
from app.deps import get_current_user
from app.routers.assessments import _get_assessment_or_404, _require_teacher_of_class
from app.routers.classes import _require_member

router = APIRouter(tags=["submissions"])


def _get_submission_or_404(db: Session, submission_id: str) -> models.Submission:
    submission = db.get(models.Submission, submission_id)
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Copie introuvable")
    return submission


@router.post(
    "/assessments/{assessment_id}/start",
    response_model=schemas.SubmissionOut,
    status_code=status.HTTP_200_OK,
)
def start_submission(
    assessment_id: str, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)
):
    assessment = _get_assessment_or_404(db, assessment_id)
    membership = _require_member(db, assessment.class_id, user)
    if membership.role_in_class == models.ClassRole.TEACHER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Le professeur ne peut pas composer")

    if assessment.start_mode == models.StartMode.FIXED and assessment.fixed_start_at:
        if datetime.utcnow() < assessment.fixed_start_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="L'évaluation n'a pas encore commencé",
            )

    existing = (
        db.query(models.Submission)
        .filter(models.Submission.assessment_id == assessment_id, models.Submission.student_id == user.id)
        .first()
    )
    if existing:
        return existing

    submission = models.Submission(assessment_id=assessment_id, student_id=user.id)
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission


@router.put("/submissions/{submission_id}/answers", response_model=schemas.AnswerOut)
def save_answer(
    submission_id: str,
    payload: schemas.AnswerSubmit,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    submission = _get_submission_or_404(db, submission_id)
    if submission.student_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ce n'est pas votre copie")
    if submission.status != models.SubmissionStatus.IN_PROGRESS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cette copie est déjà rendue")

    exercise = db.get(models.Exercise, payload.exercise_id)
    if exercise is None or exercise.assessment_id != submission.assessment_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Exercice invalide pour cette copie")

    answer = (
        db.query(models.Answer)
        .filter(models.Answer.submission_id == submission_id, models.Answer.exercise_id == payload.exercise_id)
        .first()
    )
    if answer is None:
        answer = models.Answer(submission_id=submission_id, exercise_id=payload.exercise_id, content=payload.content)
        db.add(answer)
    else:
        answer.content = payload.content

    db.commit()
    db.refresh(answer)
    return answer


@router.post("/submissions/{submission_id}/submit", response_model=schemas.SubmissionOut)
def submit_submission(
    submission_id: str, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)
):
    submission = _get_submission_or_404(db, submission_id)
    if submission.student_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ce n'est pas votre copie")
    if submission.status != models.SubmissionStatus.IN_PROGRESS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cette copie est déjà rendue")

    submission.status = models.SubmissionStatus.SUBMITTED
    submission.submitted_at = datetime.utcnow()
    db.commit()
    db.refresh(submission)
    return submission


@router.get("/assessments/{assessment_id}/submissions", response_model=list[schemas.SubmissionDetailOut])
def list_submissions(
    assessment_id: str, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)
):
    assessment = _get_assessment_or_404(db, assessment_id)
    _require_teacher_of_class(db, assessment.class_id, user)
    return (
        db.query(models.Submission)
        .options(joinedload(models.Submission.answers), joinedload(models.Submission.student))
        .filter(models.Submission.assessment_id == assessment_id)
        .all()
    )


@router.get("/submissions/{submission_id}", response_model=schemas.SubmissionDetailOut)
def get_submission(
    submission_id: str, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)
):
    submission = (
        db.query(models.Submission)
        .options(joinedload(models.Submission.answers), joinedload(models.Submission.student))
        .filter(models.Submission.id == submission_id)
        .first()
    )
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Copie introuvable")

    if submission.student_id == user.id:
        return submission

    assessment = _get_assessment_or_404(db, submission.assessment_id)
    _require_teacher_of_class(db, assessment.class_id, user)
    return submission


@router.post("/answers/{answer_id}/grade", response_model=schemas.AnswerOut)
def grade_answer(
    answer_id: str,
    payload: schemas.GradeAnswerRequest,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    answer = db.get(models.Answer, answer_id)
    if answer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Réponse introuvable")

    exercise = db.get(models.Exercise, answer.exercise_id)
    assessment = _get_assessment_or_404(db, exercise.assessment_id)
    _require_teacher_of_class(db, assessment.class_id, user)

    if payload.score < 0 or payload.score > exercise.points:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La note doit être comprise entre 0 et {exercise.points}",
        )

    answer.score = payload.score
    answer.teacher_comment = payload.teacher_comment
    answer.annotations = payload.annotations
    answer.graded_at = datetime.utcnow()
    db.commit()
    db.refresh(answer)
    return answer


@router.post("/submissions/{submission_id}/mark-graded", response_model=schemas.SubmissionOut)
def mark_submission_graded(
    submission_id: str, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)
):
    submission = _get_submission_or_404(db, submission_id)
    assessment = _get_assessment_or_404(db, submission.assessment_id)
    _require_teacher_of_class(db, assessment.class_id, user)

    submission.status = models.SubmissionStatus.GRADED
    db.commit()
    db.refresh(submission)
    return submission
