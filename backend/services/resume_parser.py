"""
Resume parsing service.
  - PDF / TXT text extraction
  - Structured profile extraction via Google Gemini (google-genai SDK)
"""

import io
import os
import json
from google import genai
from groq import Groq


# ─── Lazy client (created on first use, after .env is loaded) ───────────────

_client: genai.Client | None = None
_groq_client: Groq | None = None

def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    return _client

def _get_groq() -> Groq:
    global _groq_client
    if _groq_client is None:
        _groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    return _groq_client


# ─── File extraction ────────────────────────────────────────────────────────

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract plain text from PDF bytes using pypdf."""
    try:
        import pypdf
        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        parts = [p for page in reader.pages if (p := page.extract_text())]
        return "\n".join(parts).strip()
    except ImportError:
        try:
            from pdfminer.high_level import extract_text as _extract
            return _extract(io.BytesIO(file_bytes))
        except Exception as e:
            raise ValueError(f"PDF parsing failed: {e}")
    except Exception as e:
        raise ValueError(f"Failed to extract text from PDF: {e}")


def extract_text_from_txt(file_bytes: bytes) -> str:
    """Decode a plain-text resume file."""
    for enc in ("utf-8", "latin-1", "cp1252"):
        try:
            return file_bytes.decode(enc).strip()
        except UnicodeDecodeError:
            continue
    raise ValueError("Could not decode text file with common encodings.")


# ─── AI parsing ─────────────────────────────────────────────────────────────

def parse_resume(text: str) -> dict:
    """
    Use Gemini to extract a structured candidate profile from raw resume text.

    Returns a dict with keys:
        candidate_name, skills, technologies, domains,
        experience_years, experience_summary
    """
    prompt = f"""Extract structured information from the following resume.
Return ONLY a valid JSON object with exactly these fields — no markdown, no extra text:

{{
  "candidate_name": "Full Name or null if not found",
  "skills": ["list", "of", "core", "technical", "skills", "max 12"],
  "technologies": ["specific", "tools", "frameworks", "languages"],
  "domains": ["domain", "areas", "e.g. Web Dev, ML, DevOps"],
  "experience_years": "estimated total years as string e.g. '3-5' or null",
  "experience_summary": "Concise 2-sentence summary of candidate background and strengths."
}}

Rules:
- skills: high-level competencies (e.g. System Design, REST APIs, Machine Learning)
- technologies: concrete tools/libraries (e.g. Python, React, PostgreSQL, Docker, PyTorch)
- Return ONLY the JSON object — no code fences, no preamble, no explanation.

Resume:
{text[:4000]}"""

    try:
        response = _get_client().models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        raw = response.text.strip()
    except Exception as e:
        print(f"⚠️ Gemini resume parsing failed, falling back to Groq: {e}")
        try:
            resp = _get_groq().chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
            )
            raw = resp.choices[0].message.content.strip()
        except Exception as ge:
            print(f"❌ Groq fallback also failed: {ge}")
            raw = "{}"

    # Strip markdown fences if the model wrapped the JSON
    if raw.startswith("```"):
        lines = raw.split("\n")
        raw = "\n".join(l for l in lines if not l.strip().startswith("```")).strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {
            "candidate_name": None,
            "skills": ["Software Development"],
            "technologies": [],
            "domains": ["Software Engineering"],
            "experience_years": None,
            "experience_summary": "Resume uploaded and processed. Candidate background detected.",
        }
