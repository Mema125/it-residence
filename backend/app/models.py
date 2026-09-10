import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class UserRole(str, enum.Enum):
    TEACHER = "teacher"
    STUDENT = "student"


class ClassRole(str, enum.Enum):
    TEACHER = "teacher"
    CLASS_LEADER = "class_leader"
    STUDENT = "student"


class InviteTargetRole(str, enum.Enum):
    CLASS_LEADER = "class_leader"
    STUDENT = "student"


class StartMode(str, enum.Enum):
    FIXED = "fixed"
    SELF_PACED = "self_paced"


class ExerciseType(str, enum.Enum):
    QCM = "qcm"
    FILL_BLANK = "fill_blank"
    MATCHING = "matching"
    FREE_RESPONSE = "free_response"
    REDACTION = "redaction"


class SubmissionStatus(str, enum.Enum):
    IN_PROGRESS = "in_progress"
    SUBMITTED = "submitted"
    GRADED = "graded"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, native_enum=False), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    memberships: Mapped[list["ClassMembership"]] = relationship(
        back_populates="user", foreign_keys="ClassMembership.user_id"
    )


class ClassRoom(Base):
    __tablename__ = "classes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    teacher_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    teacher: Mapped["User"] = relationship(foreign_keys=[teacher_id])
    memberships: Mapped[list["ClassMembership"]] = relationship(
        back_populates="class_room", cascade="all, delete-orphan"
    )
    invites: Mapped[list["ClassInvite"]] = relationship(
        back_populates="class_room", cascade="all, delete-orphan"
    )
    assessments: Mapped[list["Assessment"]] = relationship(
        back_populates="class_room", cascade="all, delete-orphan"
    )


class ClassMembership(Base):
    __tablename__ = "class_memberships"
    __table_args__ = (UniqueConstraint("class_id", "user_id", name="uq_class_user"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    class_id: Mapped[str] = mapped_column(String(36), ForeignKey("classes.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    role_in_class: Mapped[ClassRole] = mapped_column(Enum(ClassRole, native_enum=False), nullable=False)
    invited_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    class_room: Mapped["ClassRoom"] = relationship(back_populates="memberships")
    user: Mapped["User"] = relationship(back_populates="memberships", foreign_keys=[user_id])


class ClassInvite(Base):
    __tablename__ = "class_invites"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    class_id: Mapped[str] = mapped_column(String(36), ForeignKey("classes.id"), nullable=False)
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True, default=lambda: uuid.uuid4().hex)
    role_to_grant: Mapped[InviteTargetRole] = mapped_column(
        Enum(InviteTargetRole, native_enum=False), nullable=False
    )
    created_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    target_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    used_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    class_room: Mapped["ClassRoom"] = relationship(back_populates="invites")


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    class_id: Mapped[str] = mapped_column(String(36), ForeignKey("classes.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    created_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    start_mode: Mapped[StartMode] = mapped_column(Enum(StartMode, native_enum=False), nullable=False)
    fixed_start_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    class_room: Mapped["ClassRoom"] = relationship(back_populates="assessments")
    exercises: Mapped[list["Exercise"]] = relationship(
        back_populates="assessment", cascade="all, delete-orphan", order_by="Exercise.order"
    )
    submissions: Mapped[list["Submission"]] = relationship(
        back_populates="assessment", cascade="all, delete-orphan"
    )


class Exercise(Base):
    __tablename__ = "exercises"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    assessment_id: Mapped[str] = mapped_column(String(36), ForeignKey("assessments.id"), nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0)
    type: Mapped[ExerciseType] = mapped_column(Enum(ExerciseType, native_enum=False), nullable=False)
    prompt: Mapped[str] = mapped_column(Text, default="")
    points: Mapped[float] = mapped_column(Integer, default=1)
    data: Mapped[dict] = mapped_column(JSON, default=dict)

    assessment: Mapped["Assessment"] = relationship(back_populates="exercises")
    answers: Mapped[list["Answer"]] = relationship(back_populates="exercise", cascade="all, delete-orphan")


class Submission(Base):
    __tablename__ = "submissions"
    __table_args__ = (UniqueConstraint("assessment_id", "student_id", name="uq_assessment_student"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    assessment_id: Mapped[str] = mapped_column(String(36), ForeignKey("assessments.id"), nullable=False)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    status: Mapped[SubmissionStatus] = mapped_column(
        Enum(SubmissionStatus, native_enum=False), default=SubmissionStatus.IN_PROGRESS
    )
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    assessment: Mapped["Assessment"] = relationship(back_populates="submissions")
    student: Mapped["User"] = relationship()
    answers: Mapped[list["Answer"]] = relationship(back_populates="submission", cascade="all, delete-orphan")


class Answer(Base):
    __tablename__ = "answers"
    __table_args__ = (UniqueConstraint("submission_id", "exercise_id", name="uq_submission_exercise"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    submission_id: Mapped[str] = mapped_column(String(36), ForeignKey("submissions.id"), nullable=False)
    exercise_id: Mapped[str] = mapped_column(String(36), ForeignKey("exercises.id"), nullable=False)
    content: Mapped[dict] = mapped_column(JSON, default=dict)
    score: Mapped[float | None] = mapped_column(Integer, nullable=True)
    teacher_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    annotations: Mapped[list] = mapped_column(JSON, default=list)
    graded_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    submission: Mapped["Submission"] = relationship(back_populates="answers")
    exercise: Mapped["Exercise"] = relationship(back_populates="answers")
