from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class InterviewGenerateRequest(BaseModel):
    role: str = Field(min_length=1, max_length=120)
    interview_type: str = Field(default="Mixed", max_length=60)
    question_count: int = Field(default=6, ge=3, le=10)
    difficulty: str = Field(default="Medium", max_length=20)


class MockInterviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: str
    difficulty: str | None
    interview_type: str | None
    questions: list | None
    score: float | None
    feedback: str | None
    created_at: datetime


class MockInterviewAnswerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    question: str
    answer: str | None
    score: float | None
    feedback: str | None


class MockInterviewDetailOut(MockInterviewOut):
    answers: list[MockInterviewAnswerOut] = []


class BetterAnswerOut(BaseModel):
    question: str
    better_answer: str


class MockInterviewDetailList(BaseModel):
    items: list[MockInterviewDetailOut]


class InterviewGenerateOut(BaseModel):
    id: int
    role: str
    interview_type: str
    difficulty: str
    questions: list[str]


class InterviewAnswerIn(BaseModel):
    question: str = Field(min_length=1)
    answer: str = Field(min_length=1, max_length=4000)


class InterviewSubmitRequest(BaseModel):
    answers: list[InterviewAnswerIn]


class AnswerFeedback(BaseModel):
    question: str
    score: int
    feedback: str


class InterviewSubmitOut(BaseModel):
    interview_id: int
    overall_score: int
    overall_feedback: str
    answers: list[AnswerFeedback]


class MockInterviewList(BaseModel):
    items: list[MockInterviewOut]
