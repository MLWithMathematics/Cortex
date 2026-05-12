import { useState, useEffect, useRef } from 'react'
import { api } from '../services/api.js'

function TypingIndicator() {
  return (
    <div className="message msg-ai">
      <div className="message-avatar">🤖</div>
      <div className="message-bubble">
        <div className="typing-dots"><span /><span /><span /></div>
      </div>
    </div>
  )
}

/** Pill badge for question type */
function QuestionTypeBadge({ type, difficulty }) {
  const typeLabel = type === 'short_answer' ? '⚡ Short Answer' : '📝 Descriptive'
  const typeColor = type === 'short_answer' ? 'tag-green' : 'tag-blue'

  const diffLabel = { easy: '🟢 Easy', medium: '🟡 Medium', hard: '🔴 Hard' }[difficulty] || '🟡 Medium'

  return (
    <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
      <span className={`tag ${typeColor}`}>{typeLabel}</span>
      <span className="tag tag-gray">{diffLabel}</span>
    </span>
  )
}

export default function InterviewStep({ sessionData, resumeData, onComplete }) {
  const { session_id, role, first_question, topic, total_questions, question_type, difficulty } = sessionData

  const [messages, setMessages] = useState([
    {
      from: 'ai',
      text: first_question,
      topic,
      qNum: 1,
      question_type: question_type || 'descriptive',
      difficulty: difficulty || 'medium',
    },
  ])
  const [answer, setAnswer]           = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [currentQNum, setCurrentQNum] = useState(1)
  const [error, setError]             = useState('')
  const [awaitingAI, setAwaitingAI]   = useState(false)
  const bottomRef   = useRef()
  const textareaRef = useRef()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, awaitingAI])

  useEffect(() => {
    textareaRef.current?.focus()
  }, [currentQNum])

  async function submitWithAnswer(text) {
    const trimmed = text.trim()
    if (!trimmed || submitting) return

    // Add user message
    setMessages(prev => [...prev, { from: 'user', text: trimmed }])
    setAnswer('')
    setSubmitting(true)
    setAwaitingAI(true)
    setError('')

    try {
      const data = await api.submitAnswer({ session_id, answer: trimmed })

      setAwaitingAI(false)

      // ── Feature 5: off-topic redirect ─────────────────────────────────────
      if (data.is_off_topic) {
        setMessages(prev => [
          ...prev,
          {
            from: 'ai',
            text: data.redirect_message ||
              'Please answer the question that was asked. If you\'re unsure, you can select "I Don\'t Know".',
            isRedirect: true,
          },
          // Re-surface the same question so the candidate can see it clearly
          {
            from: 'ai',
            text: data.next_question,
            topic: data.topic,
            qNum: data.question_number,
            question_type: data.question_type,
            difficulty: data.difficulty,
          },
        ])
        setSubmitting(false)
        return
      }

      // ── Completion ────────────────────────────────────────────────────────
      if (data.is_complete) {
        const candidateName = resumeData?.candidate_name || 'there'
        setMessages(prev => [
          ...prev,
          {
            from: 'ai',
            text: `✅ Wonderful, ${candidateName}! You've completed all ${total_questions} questions. We're now generating your personalised assessment — please hold on for just a moment…`,
          },
        ])
        setTimeout(() => onComplete(session_id), 1600)
        return
      }

      // ── Next question ─────────────────────────────────────────────────────
      setMessages(prev => [
        ...prev,
        {
          from: 'ai',
          text: data.next_question,
          topic: data.topic,
          qNum: data.question_number,
          question_type: data.question_type,
          difficulty: data.difficulty,
        },
      ])
      setCurrentQNum(data.question_number)
    } catch (e) {
      setAwaitingAI(false)
      setError(e.message || 'Failed to submit answer. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleSubmit() {
    submitWithAnswer(answer)
  }

  // ── Feature 6: IDK button ─────────────────────────────────────────────────
  function handleIDK() {
    submitWithAnswer("I don't know")
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const progress      = Math.round((currentQNum / total_questions) * 100)
  const candidateName = resumeData?.candidate_name || 'Candidate'
  const isLastQ       = currentQNum === total_questions

  // Determine hint text based on current question type
  const currentMsg = [...messages].reverse().find(m => m.from === 'ai' && m.question_type)
  const currentType = currentMsg?.question_type || 'descriptive'
  const placeholderText = currentType === 'short_answer'
    ? 'Give a concise answer (1–3 sentences)…'
    : 'Explain in detail, include examples if possible…'

  return (
    <div className="interview-layout">
      {/* Header */}
      <div className="card" style={{ padding: '20px 24px' }}>
        <div className="interview-header">
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '2px' }}>
              {candidateName}
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>
              {role} Interview
            </div>
          </div>
          <div className="interview-meta">
            <span className="tag tag-blue">Q{currentQNum} / {total_questions}</span>
            <span className="tag tag-gray">{progress}% complete</span>
          </div>
        </div>
        <div className="progress-bar-wrap">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.from === 'ai' ? 'msg-ai' : 'msg-user'}`}>
            <div className="message-avatar">
              {msg.from === 'ai' ? '🤖' : '👤'}
            </div>
            <div className="message-bubble">
              {/* Redirect styling */}
              {msg.isRedirect && (
                <div style={{
                  background: 'var(--warning-bg, #fff8e1)',
                  borderLeft: '3px solid #f59e0b',
                  padding: '6px 10px',
                  borderRadius: 4,
                  fontSize: 13,
                  color: 'var(--text-2)',
                  marginBottom: 4,
                }}>
                  ⚠️ {msg.text}
                </div>
              )}

              {/* Topic + type badges for AI questions */}
              {msg.from === 'ai' && !msg.isRedirect && msg.topic && (
                <div style={{ marginBottom: 4 }}>
                  <span className="message-topic">{msg.topic}</span>
                </div>
              )}
              {msg.from === 'ai' && !msg.isRedirect && msg.question_type && (
                <QuestionTypeBadge type={msg.question_type} difficulty={msg.difficulty} />
              )}

              {!msg.isRedirect && msg.text}
            </div>
          </div>
        ))}
        {awaitingAI && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Answer input */}
      {!awaitingAI && (
        <div className="answer-area card">
          <label className="label">
            Your Answer
            <span style={{ color: 'var(--text-3)', fontWeight: 400, marginLeft: 8 }}>
              · Ctrl+Enter to submit
            </span>
          </label>
          <textarea
            ref={textareaRef}
            className="textarea"
            style={{ minHeight: 110 }}
            placeholder={placeholderText}
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={submitting}
          />

          {error && (
            <div className="alert alert-error mt-8">⚠ {error}</div>
          )}

          <div className="answer-actions mt-12">
            <span style={{ fontSize: '12px', color: 'var(--text-3)', alignSelf: 'center' }}>
              {answer.trim().split(/\s+/).filter(Boolean).length} words
            </span>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {/* Feature 6 — IDK button */}
              <button
                className="btn btn-secondary"
                disabled={submitting}
                onClick={handleIDK}
                title="Select this if you don't know the answer"
                style={{ opacity: submitting ? 0.5 : 1 }}
              >
                🤷 I Don't Know
              </button>

              <button
                className="btn btn-primary"
                disabled={!answer.trim() || submitting}
                onClick={handleSubmit}
              >
                {submitting ? (
                  <><div className="spinner" /> Processing…</>
                ) : isLastQ ? (
                  'Submit Final Answer →'
                ) : (
                  'Submit Answer →'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
