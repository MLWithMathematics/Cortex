import os
from pathlib import Path
from typing import List

import chromadb
from chromadb.utils import embedding_functions

KNOWLEDGE_BASE_DIR = Path(__file__).parent.parent / "knowledge_base"
CHROMA_PERSIST_DIR = Path(__file__).parent.parent / "chroma_db"
CHROMA_PERSIST_DIR.mkdir(exist_ok=True)

# Role slug → knowledge base filename mapping
ROLE_FILE_MAP = {
    "backend engineer": "backend_engineer.txt",
    "ai/ml engineer": "ai_ml_engineer.txt",
    "frontend engineer": "frontend_engineer.txt",
    "devops engineer": "devops_engineer.txt",
}

# Normalise a role string to a safe ChromaDB collection name
def _role_to_key(role: str) -> str:
    return role.lower().replace(" ", "_").replace("/", "_").replace("-", "_")


def _get_embedding_fn():
    """Return ChromaDB default embedding function (all-MiniLM-L6-v2)."""
    return embedding_functions.DefaultEmbeddingFunction()


def _get_client() -> chromadb.PersistentClient:
    return chromadb.PersistentClient(path=str(CHROMA_PERSIST_DIR))


def chunk_text(text: str, chunk_size: int = 400, overlap: int = 60) -> List[str]:
    """
    Split text into overlapping word-based chunks.
    chunk_size: target words per chunk
    overlap: words shared between consecutive chunks (for context preservation)
    """
    words = text.split()
    chunks: List[str] = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i : i + chunk_size])
        chunks.append(chunk)
        if i + chunk_size >= len(words):
            break
        i += chunk_size - overlap
    return chunks


async def initialize_knowledge_base():
    """
    Load all role knowledge base documents into ChromaDB on startup.
    Skips collections that already have data (idempotent).
    """
    client = _get_client()
    embed_fn = _get_embedding_fn()

    for role_label, filename in ROLE_FILE_MAP.items():
        filepath = KNOWLEDGE_BASE_DIR / filename
        if not filepath.exists():
            print(f"⚠️  Knowledge base file missing: {filename}")
            continue

        collection_name = _role_to_key(role_label)

        try:
            collection = client.get_or_create_collection(
                name=collection_name,
                embedding_function=embed_fn,
                metadata={"hnsw:space": "cosine"},
            )

            if collection.count() > 0:
                print(f"  ↳ '{collection_name}' already loaded ({collection.count()} chunks)")
                continue

            text = filepath.read_text(encoding="utf-8")
            chunks = chunk_text(text)

            collection.add(
                documents=chunks,
                ids=[f"{collection_name}_chunk_{i}" for i in range(len(chunks))],
            )
            print(f"✅ Loaded '{collection_name}': {len(chunks)} chunks")

        except Exception as e:
            print(f"❌ Failed to load '{collection_name}': {e}")


def retrieve_relevant_context(role: str, query: str, n_results: int = 4) -> List[str]:
    """
    Query ChromaDB for the most relevant knowledge chunks.
    Returns a list of document strings.
    """
    client = _get_client()
    embed_fn = _get_embedding_fn()
    collection_name = _role_to_key(role)

    try:
        collection = client.get_collection(
            name=collection_name, embedding_function=embed_fn
        )
        count = collection.count()
        if count == 0:
            return []

        results = collection.query(
            query_texts=[query],
            n_results=min(n_results, count),
        )
        return results["documents"][0] if results["documents"] else []

    except Exception as e:
        print(f"RAG retrieval error for '{collection_name}': {e}")
        return []


def build_query(resume_data: dict, role: str, previous_topics: List[str] = None) -> str:
    """
    Construct a meaningful search query from resume data and conversation state.
    Steers away from already-covered topics.
    """
    skills = resume_data.get("skills", [])[:6]
    technologies = resume_data.get("technologies", [])[:4]
    domains = resume_data.get("domains", [])[:3]

    parts = [role, "technical concepts"]

    if skills:
        parts.append(", ".join(skills))
    if technologies:
        parts.append(", ".join(technologies))
    if domains:
        parts.append(", ".join(domains))

    if previous_topics:
        # Pivot away from recent topics to ensure breadth
        recent = previous_topics[-2:]
        parts.append(f"excluding {', '.join(recent)}")

    return " ".join(parts)
