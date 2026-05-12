# 🎯 Cortex — AI Candidate Screening System

A **production-ready, RAG-powered technical interview platform** running on **Google Gemini + Groq** with intelligent adaptive questioning, mixed question formats, real-time off-topic detection, and per-question ideal answer feedback.

---

## 🤖 AI Provider Split

| Task | Provider | Model | Why |
|------|----------|-------|-----|
| Resume parsing | **Google Gemini** | `gemini-3-flash` | Structured JSON extraction, long context |
| Interview questions | **Groq** | `llama-3.3-70b-versatile` | Ultra-fast inference for real-time chat feel |
| Off-topic detection | **Groq** | `llama-3.3-70b-versatile` | Lightweight 1-shot relevance check |
| Session assessment | **Google Gemini** | `gemini-2.5-flash` | Deeper reasoning, longer structured output |
| Embeddings (RAG) | **ChromaDB local** | `all-MiniLM-L6-v2` | No API key needed, runs locally |

---

## ✨ Features

### Core
- **Resume Parsing** — Upload PDF or TXT; Gemini extracts skills, technologies, and experience summary
- **Role-Based Interviews** — Backend Engineer, AI/ML Engineer, Frontend Engineer, DevOps Engineer
- **RAG Pipeline** — ChromaDB vector store retrieves role-specific knowledge to ground every question
- **Session History** — Browse and re-open any past completed interview report
- **Dark-mode UI** — Clean React frontend with a polished chat-style interview UX
- **Transcript Download** — Export full Q&A, ideal answers, verdict, and assessment as a `.txt` file

### 🆕 Intelligent Questioning (v2)
- **Adaptive Difficulty** — Questions automatically get harder or easier based on how the candidate answers. Two strong answers → difficulty raises to `hard`; two weak or skipped answers → drops to `easy`.
- **Mixed Question Types** — Every session mixes `short_answer` (concise, 1–3 sentence) and `descriptive` (detailed explanation / walkthrough) questions. Each question is labelled so the candidate knows what's expected.
- **Off-Topic Detection** — If a candidate submits a general query or unrelated message, the system detects it with a Groq relevance check, shows a polite redirect, and repeats the same question without consuming a turn.
- **"I Don't Know" Option** — Candidates can click **🤷 I Don't Know** instead of typing. IDK answers are saved, automatically lower the next question's difficulty, and are reflected in the final assessment.

### 🆕 Richer Assessment (v2)
- **Per-Question Ideal Answers** — The summary report now shows a green `✅ Ideal Answer` block alongside every question, so candidates know exactly what a strong response looks like.
- **Performance Ratings** — Each answer is rated: `Excellent`, `Good`, `Fair`, `Poor`, or `Skipped`.
- **Verdict Badge** — The report opens with a clear `Strong Match`, `Potential Match`, or `Not a Match` verdict.
- **Personalised Closing Message** — Every completed interview ends with a warm, tailored sign-off. Selected candidates get encouragement and next steps; non-selected candidates receive a kind, respectful message acknowledging their effort.

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+, Node.js 20+
- **Gemini API key** → https://aistudio.google.com/app/apikey
- **Groq API key** → https://console.groq.com/keys

### Option A: Local Development

```bash
# 1. Backend
cd candidate-screening-system/backend
cp .env.example .env
# Edit .env — add GEMINI_API_KEY and GROQ_API_KEY

python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run the one-time DB migration (adds question_type & difficulty columns)
python migrate_db.py

uvicorn main:app --reload --port 8000
```

```bash
# 2. Frontend (new terminal)
cd candidate-screening-system/frontend
npm install
npm run dev
# → Open http://localhost:5173
```

### Option B: Docker Compose

```bash
cp .env.example .env
# Edit .env — add GEMINI_API_KEY and GROQ_API_KEY

docker compose up --build
# Frontend → http://localhost:3000
# API docs → http://localhost:8000/docs
```

> **Existing database?** If you have a `screening.db` from a previous version, run `python migrate_db.py` once before starting the server. It safely adds the two new columns (`question_type`, `difficulty`) to the `qa_pairs` table without touching existing data.

---

## ⚙️ Environment Variables

Create `backend/.env` from `backend/.env.example`:

```env
# Google Gemini — resume parsing + assessment
# Get key: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# Groq — real-time question generation + off-topic detection
# Get key: https://console.groq.com/keys
GROQ_API_KEY=your_groq_api_key_here

# Optional database (defaults to SQLite)
# DATABASE_URL=sqlite:///./screening.db
```

---

## 📁 Project Structure

```
candidate-screening-system/
├── backend/
│   ├── main.py                    # FastAPI app + startup + key validation
│   ├── requirements.txt           # google-genai, groq, chromadb, fastapi…
│   ├── migrate_db.py              # One-shot migration: adds question_type & difficulty columns
│   ├── .env.example               # GEMINI_API_KEY, GROQ_API_KEY
│   ├── models/
│   │   ├── database.py            # SQLAlchemy models (QAPair: +question_type, +difficulty)
│   │   └── schemas.py             # Pydantic schemas (+question_type, +difficulty, +is_off_topic)
│   ├── routers/
│   │   ├── resume.py              # POST /upload-resume
│   │   ├── interview.py           # POST /start-session, /submit-answer (+ off-topic guard)
│   │   └── sessions.py            # GET /sessions, /session/:id/summary (+ ideal answers)
│   ├── services/
│   │   ├── resume_parser.py       # PDF/TXT extraction + Gemini parsing
│   │   ├── rag_service.py         # ChromaDB ingestion & retrieval (local)
│   │   ├── question_generator.py  # Adaptive questions, mixed types, off-topic detection, assessment
│   │   └── session_manager.py     # SQLAlchemy CRUD (+ question_type, difficulty fields)
│   └── knowledge_base/
│       ├── backend_engineer.txt
│       ├── ai_ml_engineer.txt
│       ├── frontend_engineer.txt
│       └── devops_engineer.txt
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   ├── components/
│   │   │   ├── UploadStep.jsx
│   │   │   ├── InterviewStep.jsx   # IDK button, type/difficulty badges, off-topic redirect
│   │   │   ├── SummaryStep.jsx     # Ideal answers, verdict badge, personalised closing message
│   │   │   └── SessionsHistory.jsx
│   │   └── services/api.js
│   ├── package.json
│   └── vite.config.js
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/upload-resume` | Upload PDF/TXT → Gemini parses profile |
| `GET`  | `/api/roles` | List available interview roles |
| `POST` | `/api/start-session` | Start interview → Groq generates first question |
| `POST` | `/api/submit-answer` | Submit answer → off-topic check → next question or completion |
| `GET`  | `/api/session/{id}/summary` | Full transcript + ideal answers + verdict + Gemini assessment |
| `GET`  | `/api/sessions` | List all past sessions |

Interactive docs at **http://localhost:8000/docs**

### Key Response Fields (v2)

**`POST /api/start-session`**
```json
{
  "session_id": "...",
  "first_question": "...",
  "question_type": "descriptive",
  "difficulty": "medium"
}
```

**`POST /api/submit-answer`**
```json
{
  "next_question": "...",
  "question_type": "short_answer",
  "difficulty": "hard",
  "is_off_topic": false,
  "redirect_message": null,
  "is_complete": false
}
```

> When `is_off_topic` is `true`, `next_question` repeats the same question, no interview turn is consumed, and `redirect_message` contains a polite nudge for the candidate.

**`GET /api/session/{id}/summary`**
```json
{
  "verdict": "Strong Match",
  "closing_message": "Congratulations! Your performance was outstanding…",
  "insights": "## Technical Strengths\n...",
  "qa_pairs": [
    {
      "order": 1,
      "question": "...",
      "answer": "...",
      "ideal_answer": "A concise model answer for this question.",
      "performance": "Good",
      "question_type": "descriptive",
      "difficulty": "medium"
    }
  ]
}
```

---

## 🧠 How Adaptive Questioning Works

```
Answer quality heuristic
  ├── IDK / fewer than 12 words   →  "poor"
  ├── 12–49 words                 →  "fair"
  └── 50+ words                   →  "good"

Last 2 answers both "poor"   →  next difficulty = easy
Last 2 answers both "good"   →  next difficulty = hard
Otherwise                    →  next difficulty = medium

Question type alternation
  ├── Odd question number    →  descriptive  (full explanation expected)
  └── Even question number   →  short_answer (concise, 1–3 sentences)

After IDK or very short answer  →  forced short_answer to re-engage candidate
```

---

## 🔧 Extending the System

### Swap Groq model
Edit `GROQ_MODEL` in `backend/services/question_generator.py`.
Popular options: `mixtral-8x7b-32768`, `gemma2-9b-it`, `llama-3.1-8b-instant`.

### Swap Gemini model
Change `GEMINI_MODEL` in `question_generator.py` (and the resume parser model in `resume_parser.py`) to other supported models for different speed/quality tradeoffs.

### Adjust interview length
Change `MAX_QUESTIONS` in `backend/services/question_generator.py` (default: `7`).

### Add a new role
1. Create `backend/knowledge_base/your_role.txt`
2. Add to `ROLE_FILE_MAP` in `rag_service.py`
3. Add to `AVAILABLE_ROLES` in `routers/interview.py`
4. Add icon/description to `ROLE_META` in `frontend/src/components/UploadStep.jsx`

### Tune difficulty thresholds
Edit `_answer_quality()` in `question_generator.py` — adjust the word-count thresholds (`12` for poor, `50` for good) to match your hiring bar.

### Customise the IDK phrase list
Add or remove entries from the `IDK_PHRASES` set in `question_generator.py` to control which responses trigger the IDK flow (difficulty reduction, graceful logging).

---

## 👨‍💻 Author

**Shubhankar**

## 📄 License

This project is licensed under the MIT License.
