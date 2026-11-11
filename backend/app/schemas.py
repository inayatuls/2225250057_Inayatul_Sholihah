from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


class RegisterStudent(BaseModel):
    display_name: str = Field(min_length=1, max_length=60)
    username: str = Field(min_length=3, max_length=30, pattern=r"^[a-zA-Z0-9_.]+$")
    password: str = Field(min_length=6, max_length=128)

    @field_validator("username")
    @classmethod
    def lower(cls, v: str) -> str:
        return v.lower()


class RegisterTeacher(BaseModel):
    display_name: str = Field(min_length=1, max_length=60)
    email: str = Field(min_length=5, max_length=255, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def lower(cls, v: str) -> str:
        return v.lower()


class Login(BaseModel):
    identifier: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=128)


class MePatch(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=60)
    onboarding_done: bool | None = None


class ChangePassword(BaseModel):
    old_password: str | None = None
    new_password: str = Field(min_length=6, max_length=128)


class ClassCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)


class ClassPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=50)
    sequential_unlock: bool | None = None
    survey_enabled: bool | None = None
    is_archived: bool | None = None


class JoinClass(BaseModel):
    join_code: str = Field(min_length=6, max_length=6)


class AttemptIn(BaseModel):
    client_attempt_id: str | None = Field(default=None, max_length=36)
    question_id: str
    answer: dict[str, Any]
    duration_ms: int | None = Field(default=None, ge=0, le=86_400_000)


class ProgressPatch(BaseModel):
    last_segment_index: int = Field(ge=0, le=100)


class ModelingStart(BaseModel):
    question_id: str


class StepIn(BaseModel):
    input: dict[str, Any]


class SolveIn(BaseModel):
    model: dict[str, Any]


class SaveModelIn(BaseModel):
    title: str = Field(min_length=1, max_length=80)
    model: dict[str, Any]


class SurveyIn(BaseModel):
    instrument: Literal["paas", "sus"]
    context: str = Field(min_length=1, max_length=40)
    values: dict[str, Any]
