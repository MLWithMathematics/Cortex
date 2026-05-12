import { useState, useEffect } from 'react'
import { api } from '../services/api.js'

export default function SessionsHistory({ onViewSession }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [confirmId, setConfirmId] = useState(null)

  useEffect(() => {
    api.listSessions()
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(session_id) {
    setDeletingId(session_id)
    try {
      await api.deleteSession(session_id)
      setSessions(prev => prev.filter(s => s.session_id !== session_id))
    } catch (e) {
      alert('Failed to delete session: ' + e.message)
    } finally {
      setDeletingId(null)
      setConfirmId(null)
    }
  }

  if (loading) return (
    <div className="card">
      <div style={{ color: 'var(--text-3)', fontSize: 14 }}>Loading sessions…</div>
    </div>
  )

  if (!sessions.length) return (
    <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
      <div style={{ fontSize: 15, fontWeight: 600 }}>No past sessions</div>
      <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
        Complete an interview to see it here.
      </div>
    </div>
  )

  return (
    <div className="card">
      <h2 className="card-title" style={{ marginBottom: 20 }}>Past Sessions</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sessions.map(s => (
          <div
            key={s.session_id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '14px 16px',
              background: 'var(--bg-2)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                {s.candidate_name || 'Unnamed Candidate'}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span className="tag tag-gray">{s.role}</span>
                <span className={`tag ${s.status === 'completed' ? 'tag-green' : 'tag-amber'}`}>
                  {s.status}
                </span>
                <span className="tag tag-gray">{s.total_questions} Qs</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {s.created_at && (
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                  {new Date(s.created_at).toLocaleDateString()}
                </span>
              )}
              {s.status === 'completed' && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => onViewSession(s.session_id)}
                >
                  View Report
                </button>
              )}
              {confirmId === s.session_id ? (
                <>
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Sure?</span>
                  <button
                    className="btn btn-sm"
                    style={{ background: 'var(--red, #ef4444)', color: '#fff', border: 'none' }}
                    disabled={deletingId === s.session_id}
                    onClick={() => handleDelete(s.session_id)}
                  >
                    {deletingId === s.session_id ? '…' : 'Yes, delete'}
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setConfirmId(null)}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  className="btn btn-secondary btn-sm"
                  title="Delete session"
                  onClick={() => setConfirmId(s.session_id)}
                  style={{ color: 'var(--red, #ef4444)' }}
                >
                  🗑
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
