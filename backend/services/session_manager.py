import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session as DBSession

from models.database import InterviewSession, QAPair


def create_session(
    db: DBSession,
    role: str,
    resume_text: str,
    resume_data: dict,
    candidate_name: Optional[str] = None,
) -> InterviewSession:
    session_id = str(uuid.uuid4())
    name = candidate_name or resume_data.get("candidate_name")
    session = InterviewSession(
        id=session_id,
        candidate_name=name,
        role=role,
        resume_text=resume_text,
        resume_skills=resume_data,
        status="active",
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def get_session(db: DBSession, session_id: str) -> Optional[InterviewSession]:
    return db.query(InterviewSession).filter(InterviewSession.id == session_id).first()


def add_question(
    db: DBSession,
    session_id: str,
    question: str,
    topic: str,
    context_used: str,
    order: int,
    question_type: str = "descriptive",
    difficulty: str = "medium",
) -> QAPair:
    qa = QAPair(
        session_id=session_id,
        order=order,
        question=question,
        topic=topic,
        context_used=context_used,
        question_type=question_type,
        difficulty=difficulty,
    )
    db.add(qa)
    db.commit()
    db.refresh(qa)
    return qa


def get_pending_question(db: DBSession, session_id: str) -> Optional[QAPair]:
    """Return the earliest unanswered question in the session."""
    return (
        db.query(QAPair)
        .filter(QAPair.session_id == session_id, QAPair.answer == None)  # noqa: E711
        .order_by(QAPair.order)
        .first()
    )


def update_answer(db: DBSession, session_id: str, order: int, answer: str) -> Optional[QAPair]:
    qa = (
        db.query(QAPair)
        .filter(QAPair.session_id == session_id, QAPair.order == order)
        .first()
    )
    if qa:
        qa.answer = answer
        db.commit()
        db.refresh(qa)
    return qa


def get_qa_history(db: DBSession, session_id: str) -> List[dict]:
    pairs = (
        db.query(QAPair)
        .filter(QAPair.session_id == session_id)
        .order_by(QAPair.order)
        .all()
    )
    return [
        {
            "question":      p.question,
            "answer":        p.answer,
            "topic":         p.topic,
            "question_type": p.question_type,
            "difficulty":    p.difficulty,
        }
        for p in pairs
    ]


def count_questions(db: DBSession, session_id: str) -> int:
    return db.query(QAPair).filter(QAPair.session_id == session_id).count()


def complete_session(db: DBSession, session_id: str):
    session = get_session(db, session_id)
    if session:
        session.status = "completed"
        session.completed_at = datetime.utcnow()
        db.commit()
