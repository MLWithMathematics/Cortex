import { useState, useEffect } from 'react'
import { api } from '../services/api.js'

function renderInsights(md) {
  return md
    .split('\n')
    .map(line => {
      if (line.startsWith('## '))  return `<h2>${line.slice(3)}</h2>`
      if (line.startsWith('### ')) return `<h3>${line.slice(4)}</h3>`
      if (line.startsWith('**') && line.endsWith('**')) {
        return `<strong>${line.slice(2, -2)}</strong>`
      }
      const bolded = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      if (bolded.trim() === '') return '<br/>'
      return `<p>${bolded}</p>`
    })
    .join('')
}

/** Verdict banner colour + icon */
const VERDICT_CONFIG = {
  'Strong Match':    { bg: '#d1fae5', border: '#34d399', icon: '🎉', label: 'Strong Match' },
  'Potential Match': { bg: '#fef9c3', border: '#fbbf24', icon: '🌟', label: 'Potential Match' },
  'Not a Match':     { bg: '#fee2e2', border: '#f87171', icon: '🙏', label: 'Not a Match' },
}

const PERFORMANCE_BADGE = {
  Excellent: { bg: '#d1fae5', color: '#065f46' },
  Good:      { bg: '#dbeafe', color: '#1e40af' },
  Fair:      { bg: '#fef9c3', color: '#92400e' },
  Poor:      { bg: '#fee2e2', color: '#991b1b' },
  Skipped:   { bg: '#f3f4f6', color: '#6b7280' },
}

export default function SummaryStep({ sessionId, onRestart }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [tab, setTab]         = useState('insights') // 'insights' | 'transcript'

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const result = await api.getSessionSummary(sessionId)
        if (!cancelled) setData(result)
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load summary.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [sessionId])

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '60px 32px' }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>🧠</div>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Generating Assessment…</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 24 }}>
          Analysing your answers with AI — this takes a few seconds
        </div>
        <div className="typing-dots" style={{ justifyContent: 'center' }}>
          <span /><span /><span />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card">
        <div className="alert alert-error">{error}</div>
        <button className="btn btn-secondary mt-16" onClick={onRestart}>↩ Start Over</button>
      </div>
    )
  }

  const answeredCount = data.qa_pairs.filter(q => q.answer && q.answer !== "I don't know").length
  const totalCount    = data.qa_pairs.length
  const verdict       = data.verdict || 'Potential Match'
  const vConf         = VERDICT_CONFIG[verdict] || VERDICT_CONFIG['Potential Match']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Hero ── */}
      <div className="card" style={{ textAlign: 'center', padding: '40px 32px' }}>
        <div className="summary-checkmark">✅</div>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>
          Interview Complete
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 16 }}>
          {data.candidate_name && (
            <><strong style={{ color: 'var(--text)' }}>{data.candidate_name}</strong> · </>
          )}
          {data.role}
        </div>

        {/* Verdict badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: vConf.bg,
          border: `1px solid ${vConf.border}`,
          borderRadius: 8,
          padding: '8px 18px',
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 16,
        }}>
          {vConf.icon} {vConf.label}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="tag tag-green">{answeredCount}/{totalCount} Questions Answered</span>
          {data.completed_at && (
            <span className="tag tag-gray">
              {new Date(data.completed_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </span>
          )}
        </div>
      </div>

      {/* ── Feature 2: Polite closing message ── */}
      {data.closing_message && (
        <div className="card" style={{
          background: vConf.bg,
          border: `1px solid ${vConf.border}`,
          borderRadius: 10,
          padding: '20px 24px',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8 }}>
            {vConf.icon} A message for you
          </div>
          <div style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--text)' }}>
            {data.closing_message}
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{
        display: 'flex', gap: 4,
        background: 'var(--surface)', padding: 4,
        borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
      }}>
        {[
          { key: 'insights',   label: '📊 AI Assessment' },
          { key: 'transcript', label: '📝 Transcript & Ideal Answers' },
        ].map(t => (
          <button
            key={t.key}
            className={`btn${tab === t.key ? ' btn-primary' : ' btn-secondary'}`}
            style={{ flex: 1, border: 'none' }}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Assessment Tab ── */}
      {tab === 'insights' && (
        <div className="card">
          <h2 className="card-title" style={{ marginBottom: 16 }}>AI Assessment</h2>
          <div
            className="insights-box"
            dangerouslySetInnerHTML={{ __html: renderInsights(data.insights || '') }}
          />
        </div>
      )}

      {/* ── Transcript Tab (Feature 1: ideal answers) ── */}
      {tab === 'transcript' && (
        <div className="card">
          <h2 className="card-title" style={{ marginBottom: 20 }}>
            Interview Transcript &amp; Ideal Answers
          </h2>
          <div className="qa-list">
            {data.qa_pairs.map((qa, i) => {
              const perfConf = PERFORMANCE_BADGE[qa.performance] || PERFORMANCE_BADGE['Fair']
              return (
                <div key={i} className="qa-item" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20, marginBottom: 20 }}>
                  {/* Question header */}
                  <div className="qa-item-header" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                    <span className="qa-num">Q{qa.order}</span>
                    {qa.topic && <span className="tag tag-blue">{qa.topic}</span>}
                    {qa.question_type && (
                      <span className={`tag ${qa.question_type === 'short_answer' ? 'tag-green' : 'tag-gray'}`}>
                        {qa.question_type === 'short_answer' ? '⚡ Short' : '📝 Descriptive'}
                      </span>
                    )}
                    {qa.difficulty && (
                      <span className="tag tag-gray" style={{ textTransform: 'capitalize' }}>
                        {qa.difficulty}
                      </span>
                    )}
                    {qa.performance && (
                      <span style={{
                        background: perfConf.bg,
                        color: perfConf.color,
                        borderRadius: 6,
                        padding: '2px 10px',
                        fontSize: 12,
                        fontWeight: 600,
                      }}>
                        {qa.performance}
                      </span>
                    )}
                  </div>

                  {/* Question text */}
                  <div className="qa-question" style={{ marginBottom: 10 }}>{qa.question}</div>

                  {/* Candidate's answer */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                      Your Answer
                    </div>
                    <div className="qa-answer" style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      padding: '10px 14px',
                      fontSize: 14,
                    }}>
                      {qa.answer
                        ? qa.answer
                        : <em style={{ color: 'var(--text-3)' }}>No answer recorded</em>}
                    </div>
                  </div>

                  {/* Feature 1: Ideal / model answer */}
                  {qa.ideal_answer && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                        ✅ Ideal Answer
                      </div>
                      <div style={{
                        background: '#d1fae5',
                        border: '1px solid #6ee7b7',
                        borderRadius: 6,
                        padding: '10px 14px',
                        fontSize: 14,
                        color: '#065f46',
                        lineHeight: 1.6,
                      }}>
                        {qa.ideal_answer}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Actions ── */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          className="btn btn-secondary"
          onClick={() => {
            const lines = data.qa_pairs.flatMap(qa => [
              `Q${qa.order} [${qa.topic || 'General'}] (${qa.question_type || 'descriptive'}, ${qa.difficulty || 'medium'}): ${qa.question}`,
              `Your Answer: ${qa.answer || 'N/A'}`,
              `Ideal Answer: ${qa.ideal_answer || 'N/A'}`,
              `Performance: ${qa.performance || 'N/A'}`,
              '',
            ])
            lines.push('--- Verdict ---', data.verdict || '')
            lines.push('', '--- Closing Message ---', data.closing_message || '')
            lines.push('', '--- AI Assessment ---', data.insights || '')
            const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
            const url  = URL.createObjectURL(blob)
            const a    = document.createElement('a')
            a.href     = url
            a.download = `interview-${data.candidate_name || 'candidate'}-${data.role.replace(/\s+/g, '-')}.txt`
            a.click()
            URL.revokeObjectURL(url)
          }}
        >
          ⬇ Download Report
        </button>
        <button className="btn btn-primary" onClick={onRestart}>
          + New Interview
        </button>
      </div>
    </div>
  )
}
