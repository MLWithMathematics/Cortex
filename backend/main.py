import os
# Load .env FIRST — before any service modules are imported
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from models.database import engine, Base
from routers import resume, interview, sessions
from services.rag_service import initialize_knowledge_base


def _check_env():
    missing = [k for k in ("GEMINI_API_KEY", "GROQ_API_KEY") if not os.getenv(k)]
    if missing:
        raise RuntimeError(
            f"Missing required environment variables: {', '.join(missing)}\n"
            "Create backend/.env from backend/.env.example and add your API keys."
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    _check_env()
    Base.metadata.create_all(bind=engine)
    print("✅ Database initialised")
    await initialize_knowledge_base()
    print("✅ Knowledge base loaded (ChromaDB)")
    print("   └─ Gemini : resume parsing + session assessment")
    print("   └─ Groq   : real-time question generation")
    yield


app = FastAPI(
    title="AI Candidate Screening System",
    description="RAG-powered dynamic interview platform — Gemini + Groq",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resume.router,    prefix="/api", tags=["Resume"])
app.include_router(interview.router, prefix="/api", tags=["Interview"])
app.include_router(sessions.router,  prefix="/api", tags=["Sessions"])


@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "AI Candidate Screening System API",
        "ai_providers": {
            "resume_parsing": "Google Gemini (gemini-2.5-flash)",
            "question_generation": "Groq (llama-3.1-8b-instant)",
            "session_assessment": "Google Gemini (gemini-2.5-flash)",
            "embeddings": "ChromaDB default (all-MiniLM-L6-v2, local)",
        },
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
