from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from models.database import get_db, InterviewSession, QAPair
from services.question_generator import generate_session_insights

router = APIRouter()


@router.get("/session/{session_id}/summary")
async def get_session_summary(session_id: str, db: Session = Depends(get_db)):
    """
    Return the full session summary including:
      - AI-generated insights (markdown)
      - Per-question ideal answers (feature 1)
      - Personalised closing message (feature 2)
      - Verdict (Strong Match / Potential Match / Not a Match)
    """
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    qa_pairs = (
        db.query(QAPair)
        .filter(QAPair.session_id == session_id)
        .order_by(QAPair.order)
        .all()
    )

    qa_dicts = [
        {
            "order":         qa.order,
            "question":      qa.question,
            "answer":        qa.answer,
            "topic":         qa.topic,
            "question_type": qa.question_type,
            "difficulty":    qa.difficulty,
        }
        for qa in qa_pairs
    ]

    # Generate structured insights (returns a dict — see question_generator.py)
    insights_data = generate_session_insights(
        session.resume_skills or {},
        session.role,
        qa_dicts,
    )

    # Build a lookup for per-question feedback by order
    pq_feedback = {
        item["order"]: item
        for item in insights_data.get("per_question_feedback", [])
    }

    return {
        "session_id":      session.id,
        "candidate_name":  session.candidate_name,
        "role":            session.role,
        "status":          session.status,
        "total_questions": len(qa_pairs),
        "verdict":         insights_data.get("verdict", "Potential Match"),
        "closing_message": insights_data.get("closing_message", ""),
        "insights":        insights_data.get("insights_markdown", ""),
        "qa_pairs": [
            {
                "order":         qa.order,
                "question":      qa.question,
                "answer":        qa.answer,
                "topic":         qa.topic,
                "question_type": qa.question_type,
                "difficulty":    qa.difficulty,
                # Feature 1: ideal answer and performance per question
                "ideal_answer":  pq_feedback.get(qa.order, {}).get("ideal_answer", ""),
                "performance":   pq_feedback.get(qa.order, {}).get("performance", ""),
            }
            for qa in qa_pairs
        ],
        "created_at":   session.created_at.isoformat() if session.created_at else None,
        "completed_at": session.completed_at.isoformat() if session.completed_at else None,
    }


@router.delete("/session/{session_id}")
async def delete_session(session_id: str, db: Session = Depends(get_db)):
    """Delete a session and all its QA pairs."""
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    db.query(QAPair).filter(QAPair.session_id == session_id).delete()
    db.delete(session)
    db.commit()
    return {"deleted": session_id}


@router.get("/sessions")
async def list_sessions(db: Session = Depends(get_db)):
    """List all past interview sessions (newest first)."""
    sessions = (
        db.query(InterviewSession)
        .order_by(InterviewSession.created_at.desc())
        .all()
    )
    result = []
    for s in sessions:
        total = db.query(QAPair).filter(QAPair.session_id == s.id).count()
        result.append(
            {
                "session_id":     s.id,
                "candidate_name": s.candidate_name,
                "role":           s.role,
                "status":         s.status,
                "total_questions": total,
                "created_at":     s.created_at.isoformat() if s.created_at else None,
            }
        )
    return result
