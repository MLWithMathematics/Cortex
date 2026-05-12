from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class ResumeUploadResponse(BaseModel):
    session_id: str
    skills: List[str]
    technologies: List[str]
    experience_summary: str
    candidate_name: Optional[str] = None
    message: str


class StartSessionRequest(BaseModel):
    session_id: str
    role: str
    candidate_name: Optional[str] = None


class StartSessionResponse(BaseModel):
    session_id: str
    role: str
    first_question: str
    topic: str
    question_number: int
    total_questions: int
    message: str
    question_type: str = "descriptive"   # short_answer | descriptive
    difficulty: str = "medium"           # easy | medium | hard


class SubmitAnswerRequest(BaseModel):
    session_id: str
    answer: str


class SubmitAnswerResponse(BaseModel):
    session_id: str
    next_question: Optional[str] = None
    topic: Optional[str] = None
    question_number: Optional[int] = None
    total_questions: int
    is_complete: bool
    message: str
    question_type: Optional[str] = None   # short_answer | descriptive
    difficulty: Optional[str] = None      # easy | medium | hard
    is_off_topic: bool = False             # True if answer was off-topic / general query
    redirect_message: Optional[str] = None  # Polite nudge when off-topic


class QAPairOut(BaseModel):
    order: int
    question: str
    answer: Optional[str] = None
    topic: Optional[str] = None
    question_type: Optional[str] = None
    difficulty: Optional[str] = None

    class Config:
        from_attributes = True


class SessionListItem(BaseModel):
    session_id: str
    candidate_name: Optional[str] = None
    role: str
    status: str
    total_questions: int
    created_at: Optional[str] = None

    class Config:
        from_attributes = True
