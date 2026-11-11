"""Model SQLAlchemy. Lihat docs/08-skema-database.md."""

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def now() -> datetime:
    return datetime.now(UTC)


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    role: Mapped[str] = mapped_column(String(10))  # student | teacher | admin
    display_name: Mapped[str] = mapped_column(String(60))
    username: Mapped[str | None] = mapped_column(String(30), unique=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True)
    password_hash: Mapped[str] = mapped_column(Text)
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    research_code: Mapped[str] = mapped_column(String(12), unique=True)
    onboarding_done: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    last_active_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Classroom(Base):
    __tablename__ = "classes"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    teacher_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    name: Mapped[str] = mapped_column(String(50))
    join_code: Mapped[str] = mapped_column(String(6), unique=True)
    sequential_unlock: Mapped[bool] = mapped_column(Boolean, default=True)
    survey_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class ClassMember(Base):
    __tablename__ = "class_members"
    __table_args__ = (UniqueConstraint("class_id", "student_id"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    class_id: Mapped[str] = mapped_column(ForeignKey("classes.id", ondelete="CASCADE"))
    student_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Module(Base):
    __tablename__ = "modules"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    code: Mapped[str] = mapped_column(String(8), unique=True)
    # "module" = modul materi (M1–M6); "practice" = level Latihan Soal (L1–L3)
    kind: Mapped[str] = mapped_column(String(10), default="module", server_default="module")
    title: Mapped[str] = mapped_column(String(80))
    subtitle: Mapped[str] = mapped_column(String(160), default="")
    order_index: Mapped[int] = mapped_column(Integer)
    objective_codes: Mapped[str] = mapped_column(String(80), default="")
    minutes: Mapped[int] = mapped_column(Integer, default=20)


class LessonSegment(Base):
    __tablename__ = "lesson_segments"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    module_id: Mapped[str] = mapped_column(ForeignKey("modules.id", ondelete="CASCADE"), index=True)
    order_index: Mapped[int] = mapped_column(Integer)
    kind: Mapped[str] = mapped_column(String(16))  # hook|concept|worked|faded|reflection
    content: Mapped[dict[str, Any]] = mapped_column(JSON)


class Stimulus(Base):
    __tablename__ = "stimuli"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    module_id: Mapped[str] = mapped_column(ForeignKey("modules.id", ondelete="CASCADE"), index=True)
    slug: Mapped[str] = mapped_column(String(40), unique=True)
    title: Mapped[str] = mapped_column(String(80))
    context: Mapped[str] = mapped_column(String(12))
    content: Mapped[dict[str, Any]] = mapped_column(JSON)


class Question(Base):
    __tablename__ = "questions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    module_id: Mapped[str] = mapped_column(ForeignKey("modules.id", ondelete="CASCADE"), index=True)
    stimulus_id: Mapped[str | None] = mapped_column(ForeignKey("stimuli.id", ondelete="SET NULL"), index=True)
    slug: Mapped[str] = mapped_column(String(40), unique=True)
    type: Mapped[str] = mapped_column(String(20))
    difficulty: Mapped[int] = mapped_column(Integer)
    objective: Mapped[str] = mapped_column(String(8))
    order_index: Mapped[int] = mapped_column(Integer)
    literacy: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    content: Mapped[dict[str, Any]] = mapped_column(JSON)  # dikirim ke klien
    answer_key: Mapped[dict[str, Any]] = mapped_column(JSON)  # TIDAK dikirim ke klien
    version: Mapped[int] = mapped_column(Integer, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class HintUsage(Base):
    __tablename__ = "hint_usage"
    __table_args__ = (UniqueConstraint("student_id", "question_id"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    student_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    question_id: Mapped[str] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"))
    level: Mapped[int] = mapped_column(Integer, default=0)


class Attempt(Base):
    __tablename__ = "attempts"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    student_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    question_id: Mapped[str] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"), index=True)
    client_attempt_id: Mapped[str | None] = mapped_column(String(36), unique=True)
    answer: Mapped[dict[str, Any]] = mapped_column(JSON)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    score: Mapped[int] = mapped_column(Integer, default=0)
    hints_used: Mapped[int] = mapped_column(Integer, default=0)
    misconception_code: Mapped[str | None] = mapped_column(String(8))
    attempt_number: Mapped[int] = mapped_column(Integer, default=1)
    duration_ms: Mapped[int | None] = mapped_column(Integer)
    finished: Mapped[bool] = mapped_column(Boolean, default=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class ModelingStepAttempt(Base):
    __tablename__ = "modeling_step_attempts"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    attempt_id: Mapped[str] = mapped_column(ForeignKey("attempts.id", ondelete="CASCADE"), index=True)
    step: Mapped[str] = mapped_column(String(12))
    literacy_process: Mapped[str] = mapped_column(String(10), index=True)
    input: Mapped[dict[str, Any]] = mapped_column(JSON)
    is_correct: Mapped[bool] = mapped_column(Boolean)
    score: Mapped[int] = mapped_column(Integer)
    max_score: Mapped[int] = mapped_column(Integer)
    hints_used: Mapped[int] = mapped_column(Integer, default=0)
    misconception_code: Mapped[str | None] = mapped_column(String(8))
    try_number: Mapped[int] = mapped_column(Integer)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class ModuleProgress(Base):
    __tablename__ = "module_progress"
    __table_args__ = (UniqueConstraint("student_id", "module_id"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    student_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    module_id: Mapped[str] = mapped_column(ForeignKey("modules.id", ondelete="CASCADE"))
    status: Mapped[str] = mapped_column(String(12), default="in_progress")
    best_score: Mapped[int] = mapped_column(Integer, default=0)
    stars: Mapped[int] = mapped_column(Integer, default=0)
    last_segment_index: Mapped[int] = mapped_column(Integer, default=0)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class SurveyResponse(Base):
    __tablename__ = "survey_responses"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    student_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    instrument: Mapped[str] = mapped_column(String(8))
    context: Mapped[str] = mapped_column(String(40))
    values: Mapped[dict[str, Any]] = mapped_column(JSON)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class SavedModel(Base):
    __tablename__ = "saved_models"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(80))
    model: Mapped[dict[str, Any]] = mapped_column(JSON)
    result: Mapped[dict[str, Any]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
