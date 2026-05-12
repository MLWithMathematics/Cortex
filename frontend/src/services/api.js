const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options)
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try {
      const err = await res.json()
      msg = err.detail || JSON.stringify(err)
    } catch {}
    throw new Error(msg)
  }
  return res.json()
}

export const api = {
  /** Upload resume file (PDF or TXT) */
  uploadResume(file) {
    const form = new FormData()
    form.append('file', file)
    return request('/upload-resume', { method: 'POST', body: form })
  },

  /** Fetch available interview roles */
  getRoles() {
    return request('/roles')
  },

  /** Start interview session */
  startSession({ session_id, role, candidate_name }) {
    return request('/start-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id, role, candidate_name }),
    })
  },

  /** Submit an answer and receive the next question */
  submitAnswer({ session_id, answer }) {
    return request('/submit-answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id, answer }),
    })
  },

  /** Get the final session summary + AI insights */
  getSessionSummary(session_id) {
    return request(`/session/${session_id}/summary`)
  },

  /** List all past sessions */
  listSessions() {
    return request('/sessions')
  },

  /** Delete a session and all its QA pairs */
  deleteSession(session_id) {
    return request(`/session/${session_id}`, { method: 'DELETE' })
  },
}
