"""
migrate_db.py — Run once to add the new columns (question_type, difficulty)
to the qa_pairs table in the existing SQLite database.

Usage (from the backend/ directory):
    python migrate_db.py
"""

import sqlite3
import os

DB_PATH = os.getenv("DATABASE_URL", "sqlite:///./screening.db").replace("sqlite:///", "")

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cur  = conn.cursor()

    # Check existing columns
    cur.execute("PRAGMA table_info(qa_pairs)")
    existing = {row[1] for row in cur.fetchall()}

    added = []

    if "question_type" not in existing:
        cur.execute("ALTER TABLE qa_pairs ADD COLUMN question_type TEXT DEFAULT 'descriptive'")
        added.append("question_type")

    if "difficulty" not in existing:
        cur.execute("ALTER TABLE qa_pairs ADD COLUMN difficulty TEXT DEFAULT 'medium'")
        added.append("difficulty")

    conn.commit()
    conn.close()

    if added:
        print(f"✅  Migration complete. Added columns: {', '.join(added)}")
    else:
        print("✅  Database already up-to-date. No changes needed.")

if __name__ == "__main__":
    migrate()
