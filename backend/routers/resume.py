import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException
from models.schemas import ResumeUploadResponse
from services.resume_parser import (
    extract_text_from_pdf,
    extract_text_from_txt,
    parse_resume,
)

router = APIRouter()

# In-memory store: temp_id → {text, data}
# Cleared when session is started (transferred to DB)
_resume_store: dict = {}


@router.post("/upload-resume", response_model=ResumeUploadResponse)
async def upload_resume(file: UploadFile = File(...)):
    """
    Upload a resume (PDF or TXT).
    Returns a temp session_id and parsed profile info.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    filename = file.filename.lower()
    if not (filename.endswith(".pdf") or filename.endswith(".txt")):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload a PDF or plain-text (.txt) resume.",
        )

    content = await file.read()

    if filename.endswith(".pdf"):
        try:
            text = extract_text_from_pdf(content)
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))
    else:
        try:
            text = extract_text_from_txt(content)
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))

    if len(text.strip()) < 50:
        raise HTTPException(
            status_code=422,
            detail="Could not extract sufficient text from the resume. Please check the file.",
        )

    # Parse with Claude
    resume_data = parse_resume(text)

    # Store temporarily
    temp_id = str(uuid.uuid4())
    _resume_store[temp_id] = {"text": text, "data": resume_data}

    return ResumeUploadResponse(
        session_id=temp_id,
        skills=resume_data.get("skills", []),
        technologies=resume_data.get("technologies", []),
        experience_summary=resume_data.get("experience_summary", ""),
        candidate_name=resume_data.get("candidate_name"),
        message="Resume uploaded and parsed successfully.",
    )


def get_resume_from_store(temp_id: str) -> dict | None:
    return _resume_store.get(temp_id)


def remove_from_store(temp_id: str):
    _resume_store.pop(temp_id, None)
