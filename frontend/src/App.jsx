import { useState } from 'react'
import LandingPage from './components/LandingPage.jsx'
import UploadStep from './components/UploadStep.jsx'
import InterviewStep from './components/InterviewStep.jsx'
import SummaryStep from './components/SummaryStep.jsx'
import SessionsHistory from './components/SessionsHistory.jsx'

const STEPS = ['Upload', 'Interview', 'Results']

export default function App() {
  const [page, setPage] = useState('landing') // 'landing' | 'app'
  const [stage, setStage] = useState('upload')
  const [sessionData, setSessionData] = useState(null)
  const [resumeData, setResumeData] = useState(null)
  const [summarySessionId, setSummarySessionId] = useState(null)
  const [showHistory, setShowHistory] = useState(false)

  function handleGetStarted() {
    setPage('app')
    setStage('upload')
    setShowHistory(false)
  }

  function handleViewHistory() {
    setPage('app')
    setShowHistory(true)
    setStage('upload')
  }

  function handleUploadComplete(data, parsed) {
    setSessionData(data)
    setResumeData(parsed)
    setStage('interview')
    setShowHistory(false)
  }

  function handleInterviewComplete(sid) {
    setSummarySessionId(sid)
    setStage('summary')
  }

  function handleRestart() {
    setStage('upload')
    setSessionData(null)
    setResumeData(null)
    setSummarySessionId(null)
    setShowHistory(false)
  }

  function handleGoHome() {
    handleRestart()
    setPage('landing')
  }

  function handleViewSession(sid) {
    setSummarySessionId(sid)
    setStage('summary')
    setShowHistory(false)
  }

  // Landing page
  if (page === 'landing') {
    return <LandingPage onGetStarted={handleGetStarted} onViewHistory={handleViewHistory} />
  }

  // App flow
  const stepIndex = stage === 'upload' ? 0 : stage === 'interview' ? 1 : 2

  return (
    <div className="app">
      {/* ─── Header ─── */}
      <header className="header">
        <div className="header-content">
          <a className="logo" href="#" onClick={e => { e.preventDefault(); handleGoHome() }}>
            <img src="/logo.jpg" alt="Cortex" className="logo-img" />
          </a>

          <nav className="step-indicator">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={`step-item ${i === stepIndex ? 'active' : i < stepIndex ? 'done' : ''}`}
              >
                <div className="step-num">
                  {i < stepIndex ? '✓' : i + 1}
                </div>
                <span>{s}</span>
              </div>
            ))}
          </nav>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleGoHome}
            >
              ← Home
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setShowHistory(prev => !prev)
                if (stage !== 'upload') handleRestart()
              }}
            >
              {showHistory ? '← Back' : '📋 History'}
            </button>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="main">
        {showHistory ? (
          <SessionsHistory onViewSession={handleViewSession} />
        ) : stage === 'upload' ? (
          <UploadStep onComplete={handleUploadComplete} />
        ) : stage === 'interview' ? (
          <InterviewStep
            sessionData={sessionData}
            resumeData={resumeData}
            onComplete={handleInterviewComplete}
          />
        ) : (
          <SummaryStep
            sessionId={summarySessionId}
            onRestart={handleRestart}
          />
        )}
      </main>
    </div>
  )
}
