import { useState, useRef } from 'react'
import { api } from '../services/api.js'

const ROLE_META = {
  'Backend Engineer': { icon: '⚙️', desc: 'APIs, databases, system design, scalability' },
  'AI/ML Engineer': { icon: '🤖', desc: 'ML models, RAG, LLMs, MLOps pipelines' },
  'Frontend Engineer': { icon: '🎨', desc: 'React, performance, accessibility, TypeScript' },
  'DevOps Engineer': { icon: '🚀', desc: 'Kubernetes, CI/CD, cloud infrastructure, IaC' },
}

export default function UploadStep({ onComplete }) {
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [parsed, setParsed] = useState(null)   // resume parse result
  const [role, setRole] = useState('')
  const [candidateName, setCandidateName] = useState('')
  const [roles, setRoles] = useState([])
  const [rolesLoaded, setRolesLoaded] = useState(false)
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)
  const fileRef = useRef()

  async function loadRoles() {
    if (rolesLoaded) return
    try {
      const data = await api.getRoles()
      setRoles(data.roles)
      setRolesLoaded(true)
    } catch {
      setRoles(Object.keys(ROLE_META))
      setRolesLoaded(true)
    }
  }

  async function handleFile(f) {
    if (!f) return
    const allowed = ['application/pdf', 'text/plain']
    const extOk = f.name.endsWith('.pdf') || f.name.endsWith('.txt')
    if (!allowed.includes(f.type) && !extOk) {
      setError('Please upload a PDF or .txt resume file.')
      return
    }
    setFile(f)
    setError('')
    setUploading(true)
    try {
      const data = await api.uploadResume(f)
      setParsed(data)
      if (data.candidate_name) setCandidateName(data.candidate_name)
      await loadRoles()
    } catch (e) {
      setError(e.message || 'Failed to upload resume. Please try again.')
      setFile(null)
    } finally {
      setUploading(false)
    }
  }

  function onDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  async function handleStart() {
    if (!parsed || !role) return
    setError('')
    setStarting(true)
    try {
      const data = await api.startSession({
        session_id: parsed.session_id,
        role,
        candidate_name: candidateName.trim() || null,
      })
      onComplete(data, parsed)
    } catch (e) {
      setError(e.message || 'Failed to start interview. Please try again.')
    } finally {
      setStarting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ── Resume Upload ── */}
      <div className="card">
        <h2 className="card-title">Upload Resume</h2>
        <p className="card-subtitle">
          Upload a PDF or plain-text resume. Our AI will parse your skills and personalise the interview.
        </p>

        {!file && !uploading && (
          <div
            className={`upload-zone${dragOver ? ' drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.txt"
              style={{ display: 'none' }}
              onChange={(e) => handleFile(e.target.files[0])}
            />
            <div className="upload-icon">📄</div>
            <div className="upload-label">Drop your resume here or click to browse</div>
            <div className="upload-sub">PDF or TXT · Max 10 MB</div>
          </div>
        )}

        {uploading && (
          <div className="upload-zone" style={{ cursor: 'default', borderStyle: 'solid', borderColor: 'var(--accent)' }}>
            <div className="typing-dots">
              <span/><span/><span/>
            </div>
            <div className="upload-label">Parsing resume with AI…</div>
            <div className="upload-sub">Extracting skills & experience</div>
          </div>
        )}

        {parsed && !uploading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="alert alert-success">
              ✅ Resume parsed — {file.name}
            </div>

            <div>
              <div className="section-label">Detected Skills</div>
              <div className="chips">
                {parsed.skills.map(s => (
                  <span key={s} className="tag tag-blue">{s}</span>
                ))}
              </div>
            </div>

            {parsed.technologies?.length > 0 && (
              <div>
                <div className="section-label">Technologies</div>
                <div className="chips">
                  {parsed.technologies.map(t => (
                    <span key={t} className="tag tag-gray">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {parsed.experience_summary && (
              <div style={{
                padding: '12px 14px',
                background: 'var(--bg-2)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                fontSize: '13px',
                color: 'var(--text-2)',
                lineHeight: 1.6,
              }}>
                {parsed.experience_summary}
              </div>
            )}

            <button
              className="btn btn-secondary btn-sm"
              style={{ alignSelf: 'flex-start' }}
              onClick={() => { setFile(null); setParsed(null); setRole(''); setError('') }}
            >
              ↩ Upload a different resume
            </button>
          </div>
        )}

        {error && (
          <div className="alert alert-error mt-12">⚠ {error}</div>
        )}
      </div>

      {/* ── Role & Name (shown after parse) ── */}
      {parsed && !uploading && (
        <div className="card">
          <h2 className="card-title">Interview Setup</h2>
          <p className="card-subtitle">Choose the role you're interviewing for and confirm your name.</p>

          <div className="field">
            <label className="label">Your Name (optional)</label>
            <input
              className="input"
              type="text"
              placeholder={parsed.candidate_name || 'Full name'}
              value={candidateName}
              onChange={e => setCandidateName(e.target.value)}
            />
          </div>

          <div className="section-label" style={{ marginBottom: '10px' }}>Select Role</div>
          <div className="role-grid">
            {(roles.length ? roles : Object.keys(ROLE_META)).map(r => {
              const meta = ROLE_META[r] || { icon: '💼', desc: r }
              return (
                <button
                  key={r}
                  className={`role-card${role === r ? ' selected' : ''}`}
                  onClick={() => setRole(r)}
                >
                  <div className="role-card-icon">{meta.icon}</div>
                  <div className="role-card-name">{r}</div>
                  <div className="role-card-desc">{meta.desc}</div>
                </button>
              )
            })}
          </div>

          <button
            className="btn btn-primary btn-lg btn-full"
            disabled={!role || starting}
            onClick={handleStart}
          >
            {starting ? (
              <><div className="spinner" /> Generating first question…</>
            ) : (
              `Start Interview${role ? ` · ${role}` : ''} →`
            )}
          </button>
        </div>
      )}
    </div>
  )
}
