"""
Question & assessment generation.
  - Interview questions → Groq  (llama-3.1-8b-instant, ultra-fast for real-time chat)
  - Session assessment  → Gemini (deeper reasoning, longer output)

New capabilities (v2):
  • Adaptive difficulty  – level adjusts based on answer quality
  • Mixed question types – alternates short_answer ↔ descriptive
  • Off-topic detection  – politely redirects general queries
  • IDK handling         – gracefully lowers difficulty on "I don't know"
  • Ideal answers        – per-question model answers in the final report
  • Polite closing       – personalised sign-off for selected / not-selected
"""

import os
import json
from typing import List, Optional, Tuple

from groq import Groq
from google import genai
from services.rag_service import retrieve_relevant_context, build_query

# ─── Client initialisation ───────────────────────────────────────────────────

_groq = Groq(api_key=os.getenv("GROQ_API_KEY"))
_genai_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

GEMINI_MODEL = "gemini-2.5-flash"
GROQ_MODEL   = "llama-3.1-8b-instant"

MAX_QUESTIONS = 7  # Total questions per session

# ─── IDK / skip phrases (feature 6) ──────────────────────────────────────────
IDK_PHRASES = {
    "idk", "i don't know", "i do not know", "don't know",
    "no idea", "not sure", "skip", "pass", "i have no idea",
    "i'm not sure", "i am not sure", "no clue", "i don't know the answer",
}


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _clean_json(raw: str) -> dict:
    """Strip markdown fences and parse JSON."""
    raw = raw.strip()
    if raw.startswith("```"):
        lines = raw.split("\n")
        raw = "\n".join(l for l in lines if not l.strip().startswith("```")).strip()
    return json.loads(raw)


def _groq_chat(prompt: str, max_tokens: int = 400) -> str:
    """Single-turn Groq completion."""
    resp = _groq.chat.completions.create(
        model=GROQ_MODEL,
        max_tokens=max_tokens,
        temperature=0.7,
        messages=[{"role": "user", "content": prompt}],
    )
    return resp.choices[0].message.content


def _is_idk(answer: str) -> bool:
    """Return True if the candidate's answer is an IDK / skip variant."""
    return answer.strip().lower() in IDK_PHRASES


def _answer_quality(answer: str) -> str:
    """Heuristic answer-quality rating: 'poor' | 'fair' | 'good'."""
    if _is_idk(answer):
        return "poor"
    wc = len(answer.split())
    if wc < 12:
        return "poor"
    if wc < 50:
        return "fair"
    return "good"


def _next_difficulty(qa_history: List[dict]) -> str:
    """
    Adapt difficulty for the next question based on recent answer quality.
    - Two consecutive 'poor' answers  → drop to 'easy'
    - Two consecutive 'good' answers  → raise to 'hard'
    - Otherwise                        → stay at 'medium'
    """
    if not qa_history:
        return "medium"
    recent = qa_history[-2:]
    qualities = [_answer_quality(qa.get("answer") or "") for qa in recent]
    if all(q == "poor" for q in qualities):
        return "easy"
    if all(q == "good" for q in qualities):
        return "hard"
    return "medium"


def _next_question_type(question_number: int, qa_history: List[dict]) -> str:
    """
    Alternate short_answer ↔ descriptive. If the previous answer was IDK
    / very short, prefer short_answer to keep the candidate engaged.
    """
    if qa_history:
        last_answer = (qa_history[-1].get("answer") or "").strip()
        if _is_idk(last_answer) or len(last_answer.split()) < 10:
            return "short_answer"
    # Even question numbers → short_answer; odd → descriptive
    return "short_answer" if question_number % 2 == 0 else "descriptive"


# ─── Feature 5 – off-topic detection ─────────────────────────────────────────

def detect_off_topic(question: str, answer: str) -> bool:
    """
    Return True when the answer is a general / unrelated query rather than
    a genuine attempt to address the interview question.
    IDK answers are always considered on-topic (feature 6).
    """
    if _is_idk(answer.strip().lower()):
        return False

    prompt = (
        f"You are an interview monitor.\n\n"
        f"Interview question: {question}\n"
        f"Candidate reply: {answer}\n\n"
        "Does the candidate's reply attempt to answer the interview question, "
        "or is it a completely unrelated general query / small-talk / off-topic message?\n"
        "Reply with ONLY one word: 'relevant' or 'offtopic'."
    )
    try:
        raw = _groq_chat(prompt, max_tokens=5).strip().lower()
        return raw.startswith("offtopic") or raw.startswith("off")
    except Exception:
        return False  # Default: don't block on error


# ─── Question generation (Groq) ──────────────────────────────────────────────

def generate_first_question(
    resume_data: dict,
    role: str,
) -> Tuple[str, str, str, str, str]:
    """
    Generate the opening interview question via Groq.

    Returns: (question, topic, context_used, question_type, difficulty)
    """
    query  = build_query(resume_data, role)
    chunks = retrieve_relevant_context(role, query, n_results=4)
    context = "\n\n---\n\n".join(chunks) if chunks else "General role knowledge."

    skills     = ", ".join(resume_data.get("skills", [])[:8]) or "software engineering"
    techs      = ", ".join(resume_data.get("technologies", [])[:6])
    experience = resume_data.get("experience_summary", "")

    prompt = f"""You are a senior technical interviewer conducting a structured interview for a **{role}** position.

## Candidate Profile
- Core skills: {skills}
- Technologies: {techs}
- Background: {experience}

## Relevant Technical Context (from knowledge base)
{context}

## Task
Generate the FIRST interview question. It must:
1. Be directly relevant to the **{role}** role
2. Be personalised to the candidate's background
3. Be grounded in the technical context above
4. Test conceptual understanding OR practical application
5. Start at **medium** difficulty

Choose `question_type`:
- "descriptive" → open-ended, requires a full explanation (2-4 minutes to answer)
- "short_answer" → specific fact / definition / one-concept question (30-60 words)

Return ONLY a JSON object, no markdown fences:
{{"question": "Full question text", "topic": "Short topic label (e.g. System Design)", "question_type": "descriptive", "difficulty": "medium"}}"""

    try:
        raw  = _groq_chat(prompt, max_tokens=450)
        data = _clean_json(raw)
        return (
            data["question"],
            data["topic"],
            context,
            data.get("question_type", "descriptive"),
            data.get("difficulty", "medium"),
        )
    except Exception:
        fallback = (
            f"Can you walk me through your experience with "
            f"{skills.split(',')[0].strip()} and describe a challenging "
            f"problem you solved using it?"
        )
        return fallback, "Technical Experience", context, "descriptive", "medium"


def generate_followup_question(
    resume_data: dict,
    role: str,
    qa_history: List[dict],
) -> Tuple[Optional[str], Optional[str], Optional[str], str, str]:
    """
    Generate the next interview question via Groq, adapting to prior answers.

    Returns: (question, topic, context_used, question_type, difficulty)
             or (None, None, None, '', '') if MAX reached
    """
    if len(qa_history) >= MAX_QUESTIONS:
        return None, None, None, "", ""

    previous_topics = [qa.get("topic", "") for qa in qa_history]
    query  = build_query(resume_data, role, previous_topics)
    chunks = retrieve_relevant_context(role, query, n_results=4)
    context = "\n\n---\n\n".join(chunks) if chunks else "General role knowledge."

    # Determine adaptive parameters
    difficulty    = _next_difficulty(qa_history)
    question_type = _next_question_type(len(qa_history) + 1, qa_history)

    # Last 3 exchanges for context
    history_text = ""
    for i, qa in enumerate(qa_history[-3:], 1):
        q = qa.get("question", "")
        a = qa.get("answer") or "[No answer / IDK]"
        t = qa.get("topic", "")
        history_text += f"Q{i} [{t}]: {q}\nA{i}: {a}\n\n"

    skills  = ", ".join(resume_data.get("skills", [])[:8]) or "software engineering"
    covered = ", ".join(set(previous_topics)) if previous_topics else "none"
    current_q_num = len(qa_history) + 1

    # Quality hint for the LLM
    last_quality = _answer_quality(qa_history[-1].get("answer") or "") if qa_history else "fair"
    quality_hint = {
        "poor": "The candidate's last answer was weak or they didn't know — ask an easier, more foundational question.",
        "fair": "The candidate showed partial understanding — probe that area or move to a related concept.",
        "good": "The candidate answered well — advance to a harder or more nuanced topic.",
    }[last_quality]

    type_hint = {
        "short_answer": "short-answer (expects a concise 1–3 sentence / factual response)",
        "descriptive":  "descriptive (expects a detailed explanation, example, or walkthrough)",
    }[question_type]

    prompt = f"""You are a senior technical interviewer. This is question {current_q_num} of {MAX_QUESTIONS} for a **{role}** position.

## Candidate Skills
{skills}

## Recent Interview Exchange
{history_text}
## Topics Already Covered
{covered}

## Relevant Technical Context
{context}

## Adaptation Instructions
- Target difficulty: **{difficulty}**
- Question type: **{type_hint}**
- Quality signal: {quality_hint}

## Task
Generate the NEXT question. It must:
1. Cover a DIFFERENT topic than those already covered
2. Follow naturally from prior conversation
3. Be grounded in the technical context above
4. NOT repeat or rephrase a previous question
5. Test REAL knowledge — avoid trivial or purely theoretical questions

Return ONLY a JSON object, no markdown fences:
{{"question": "Full question text", "topic": "Short topic label", "question_type": "{question_type}", "difficulty": "{difficulty}"}}"""

    try:
        raw  = _groq_chat(prompt, max_tokens=450)
        data = _clean_json(raw)
        return (
            data["question"],
            data["topic"],
            context,
            data.get("question_type", question_type),
            data.get("difficulty", difficulty),
        )
    except Exception:
        return None, None, None, "", ""


# ─── Session assessment (Gemini) ─────────────────────────────────────────────

def generate_session_insights(
    resume_data: dict,
    role: str,
    qa_pairs: List[dict],
) -> dict:
    """
    Analyse the full interview transcript and return a structured assessment dict:
    {
        "verdict":               "Strong Match" | "Potential Match" | "Not a Match",
        "closing_message":       "Polite personalised sign-off for the candidate",
        "insights_markdown":     "Full markdown assessment",
        "per_question_feedback": [
            {"order": 1, "ideal_answer": "...", "performance": "Excellent|Good|Fair|Poor|Skipped"},
            ...
        ]
    }
    """
    qa_text = ""
    for i, qa in enumerate(qa_pairs, 1):
        topic  = qa.get("topic", "General")
        q      = qa.get("question", "")
        a      = qa.get("answer") or "No answer / IDK"
        q_type = qa.get("question_type", "descriptive")
        diff   = qa.get("difficulty", "medium")
        qa_text += f"**Q{i} [{topic}] ({q_type}, {diff}):** {q}\n**Answer:** {a}\n\n"

    skills = ", ".join(resume_data.get("skills", []))
    techs  = ", ".join(resume_data.get("technologies", []))

    prompt = f"""You are a professional technical interviewer evaluating a candidate for a **{role}** position.

## Candidate Profile
- Skills: {skills}
- Technologies: {techs}

## Full Interview Transcript
{qa_text}

## Task
Return ONLY a valid JSON object — no markdown fences, no preamble — with exactly this structure:

{{
  "verdict": "Strong Match",
  "closing_message": "2-3 warm sentences directly addressed to the candidate. If verdict is Strong Match or Potential Match: be encouraging, mention next steps, thank them sincerely. If Not a Match: acknowledge their effort kindly, encourage them to keep learning, wish them well.",
  "insights_markdown": "A structured professional markdown assessment with these exact sections:\\n## Technical Strengths\\n## Areas for Improvement\\n## Communication & Clarity\\n## Role Fit Assessment\\n## Recommended Next Steps",
  "per_question_feedback": [
    {{
      "order": 1,
      "ideal_answer": "A concise 2-4 sentence model answer for this specific question.",
      "performance": "Excellent"
    }}
  ]
}}

Rules:
- verdict must be exactly one of: "Strong Match", "Potential Match", "Not a Match"
- performance must be exactly one of: "Excellent", "Good", "Fair", "Poor", "Skipped"
- per_question_feedback must have one entry per question in the transcript
- insights_markdown must use the exact section headers shown above
- Be specific, reference actual answers where possible"""

    def _parse(raw: str) -> dict:
        raw = raw.strip()
        if raw.startswith("```"):
            lines = raw.split("\n")
            raw = "\n".join(l for l in lines if not l.strip().startswith("```")).strip()
        return json.loads(raw)

    try:
        response = _genai_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
        )
        return _parse(response.text)
    except Exception as e:
        print(f"⚠️  Gemini assessment failed, falling back to Groq: {e}")
        try:
            raw = _groq_chat(prompt, max_tokens=2000)
            return _parse(raw)
        except Exception as ge:
            print(f"❌ Groq fallback also failed: {ge}")
            # Return a safe default so the rest of the app doesn't crash
            return {
                "verdict": "Potential Match",
                "closing_message": (
                    "Thank you so much for taking the time to complete this interview. "
                    "Your responses have been recorded and our team will be in touch shortly. "
                    "We appreciate your effort and wish you all the best!"
                ),
                "insights_markdown": (
                    "## Assessment\nAssessment could not be generated at this time "
                    "due to an AI service issue. Please try again later."
                ),
                "per_question_feedback": [
                    {
                        "order": qa.get("order", i + 1),
                        "ideal_answer": "Model answer unavailable at this time.",
                        "performance": "Fair",
                    }
                    for i, qa in enumerate(qa_pairs)
                ],
            }
