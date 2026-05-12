from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from models.database import get_db
from models.schemas import (
    StartSessionRequest,
    StartSessionResponse,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
)
from services.session_manager import (
    create_session,
    get_session,
    add_question,
    get_pending_question,
    update_answer,
    get_qa_history,
    count_questions,
    complete_session,
)
from services.question_generator import (
    generate_first_question,
    generate_followup_question,
    detect_off_topic,
    MAX_QUESTIONS,
)
from routers.resume import get_resume_from_store, remove_from_store

router = APIRouter()

AVAILABLE_ROLES = [
    "Backend Engineer",
    "AI/ML Engineer",
    "Frontend Engineer",
    "DevOps Engineer",
]

# Polite redirect message shown when a candidate submits an off-topic answer
OFF_TOPIC_REDIRECT = (
    "That doesn't seem to be related to the question asked. "
    "No worries — please take your time and answer the interview question above. "
    "If you are unsure, you can always select \"I Don't Know\"."
)


@router.get("/roles")
async def list_roles():
    """Return the list of available interview roles."""
    return {"roles": AVAILABLE_ROLES}


@router.post("/start-session", response_model=StartSessionResponse)
async def start_session(request: StartSessionRequest, db: Session = Depends(get_db)):
    """
    Start an interview session.
    Requires a valid session_id from /upload-resume and a role.
    """
    if request.role not in AVAILABLE_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Available roles: {AVAILABLE_ROLES}",
        )

    resume_store = get_resume_from_store(request.session_id)
    if not resume_store:
        raise HTTPException(
            status_code=404,
            detail="Resume data not found. Please upload a resume first.",
        )

    resume_text = resume_store["text"]
    resume_data = resume_store["data"]

    session = create_session(
        db,
        role=request.role,
        resume_text=resume_text,
        resume_data=resume_data,
        candidate_name=request.candidate_name,
    )

    question, topic, context, question_type, difficulty = generate_first_question(
        resume_data, request.role
    )

    add_question(
        db, session.id, question, topic, context,
        order=1, question_type=question_type, difficulty=difficulty,
    )

    remove_from_store(request.session_id)

    return StartSessionResponse(
        session_id=session.id,
        role=request.role,
        first_question=question,
        topic=topic,
        question_number=1,
        total_questions=MAX_QUESTIONS,
        message=f"Interview started for {request.role}",
        question_type=question_type,
        difficulty=difficulty,
    )


@router.post("/submit-answer", response_model=SubmitAnswerResponse)
async def submit_answer(request: SubmitAnswerRequest, db: Session = Depends(get_db)):
    """
    Submit an answer for the current question.

    • If the answer is off-topic, the question is NOT advanced — a polite
      redirect is returned with the same question so the candidate can retry.
    • If the answer is IDK / skip, it is accepted and the difficulty is
      reduced for the next question.
    • Otherwise the answer is saved and the next question (or completion) is
      returned.
    """
    session = get_session(db, request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    if session.status == "completed":
        raise HTTPException(status_code=400, detail="This interview session is already completed.")

    pending = get_pending_question(db, request.session_id)
    if not pending:
        raise HTTPException(status_code=400, detail="No pending question found.")

    # ── Feature 5: off-topic detection ───────────────────────────────────────
    if detect_off_topic(pending.question, request.answer.strip()):
        return SubmitAnswerResponse(
            session_id=request.session_id,
            next_question=pending.question,          # repeat the same question
            topic=pending.topic,
            question_number=pending.order,
            total_questions=MAX_QUESTIONS,
            is_complete=False,
            message=f"Question {pending.order} of {MAX_QUESTIONS}",
            question_type=pending.question_type or "descriptive",
            difficulty=pending.difficulty or "medium",
            is_off_topic=True,
            redirect_message=OFF_TOPIC_REDIRECT,
        )

    # ── Save answer ───────────────────────────────────────────────────────────
    update_answer(db, request.session_id, pending.order, request.answer)

    total_asked = count_questions(db, request.session_id)

    # ── Check completion ──────────────────────────────────────────────────────
    if total_asked >= MAX_QUESTIONS:
        complete_session(db, request.session_id)
        return SubmitAnswerResponse(
            session_id=request.session_id,
            next_question=None,
            topic=None,
            question_number=None,
            total_questions=MAX_QUESTIONS,
            is_complete=True,
            message="Interview complete! Your results are ready.",
        )

    # ── Generate follow-up (with adaptive difficulty + mixed types) ───────────
    qa_history = get_qa_history(db, request.session_id)

    next_q, next_topic, context, q_type, diff = generate_followup_question(
        session.resume_skills or {},
        session.role,
        qa_history,
    )

    if not next_q:
        complete_session(db, request.session_id)
        return SubmitAnswerResponse(
            session_id=request.session_id,
            next_question=None,
            topic=None,
            question_number=None,
            total_questions=MAX_QUESTIONS,
            is_complete=True,
            message="Interview complete! Your results are ready.",
        )

    add_question(
        db, request.session_id, next_q, next_topic, context,
        order=total_asked + 1, question_type=q_type, difficulty=diff,
    )

    return SubmitAnswerResponse(
        session_id=request.session_id,
        next_question=next_q,
        topic=next_topic,
        question_number=total_asked + 1,
        total_questions=MAX_QUESTIONS,
        is_complete=False,
        message=f"Question {total_asked + 1} of {MAX_QUESTIONS}",
        question_type=q_type,
        difficulty=diff,
    )
