from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import (
    ClassRole,
    ExerciseType,
    InviteTargetRole,
    StartMode,
    SubmissionStatus,
    UserRole,
)


# ---- Auth / Users ----


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str
    role: UserRole


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    full_name: str
    role: UserRole
    created_at: datetime


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---- Classes ----


class ClassCreate(BaseModel):
    name: str


class MembershipOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user: UserOut
    role_in_class: ClassRole
    joined_at: datetime


class ClassOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    teacher_id: str
    created_at: datetime


class ClassDetailOut(ClassOut):
    memberships: list[MembershipOut] = []


class InviteCreate(BaseModel):
    role_to_grant: InviteTargetRole
    target_email: EmailStr | None = None


class InviteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    class_id: str
    token: str
    role_to_grant: InviteTargetRole
    target_email: str | None
    used_by: str | None
    created_at: datetime


class InvitePreview(BaseModel):
    class_id: str
    class_name: str
    role_to_grant: InviteTargetRole
    already_used: bool


# ---- Assessments / Exercises ----


class ExerciseCreate(BaseModel):
    order: int = 0
    type: ExerciseType
    prompt: str = ""
    points: float = 1
    data: dict = Field(default_factory=dict)


class ExerciseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    assessment_id: str
    order: int
    type: ExerciseType
    prompt: str
    points: float
    data: dict


class ExerciseForStudentOut(BaseModel):
    """Exercise view for students: strips correct-answer keys from `data`."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    assessment_id: str
    order: int
    type: ExerciseType
    prompt: str
    points: float
    data: dict


class AssessmentCreate(BaseModel):
    title: str
    description: str = ""
    start_mode: StartMode
    fixed_start_at: datetime | None = None
    duration_minutes: int | None = None


class AssessmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    class_id: str
    title: str
    description: str
    created_by: str
    start_mode: StartMode
    fixed_start_at: datetime | None
    duration_minutes: int | None
    created_at: datetime


class AssessmentDetailOut(AssessmentOut):
    exercises: list[ExerciseOut] = []


# ---- Submissions / Answers ----


class AnswerSubmit(BaseModel):
    exercise_id: str
    content: dict


class AnswerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    submission_id: str
    exercise_id: str
    content: dict
    score: float | None
    teacher_comment: str | None
    annotations: list
    graded_at: datetime | None


class SubmissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    assessment_id: str
    student_id: str
    status: SubmissionStatus
    started_at: datetime
    submitted_at: datetime | None


class SubmissionDetailOut(SubmissionOut):
    answers: list[AnswerOut] = []
    student: UserOut


class GradeAnswerRequest(BaseModel):
    score: float
    teacher_comment: str | None = None
    annotations: list = Field(default_factory=list)
