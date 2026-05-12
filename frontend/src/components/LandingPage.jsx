export default function LandingPage({ onGetStarted, onViewHistory }) {
  return (
    <div className="landing">
      {/* ─── Navbar ─── */}
      <nav className="nav">
        <div className="nav-inner">
          <a className="nav-logo" href="#">
            <img src="/logo.jpg" alt="Cortex" className="nav-logo-img" />
          </a>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#why-choose">Why Choose Us</a>
          </div>
          <div className="nav-actions">
            <button className="btn btn-ghost" onClick={onViewHistory}>History</button>
            <button className="btn btn-primary" onClick={onGetStarted}>Get Started</button>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-text">
            <h1>Your AI Partner for<br /><span className="hero-highlight">Smarter Interviews</span></h1>
            <p className="hero-desc">
              Cortex conducts intelligent, role-specific interviews, evaluates responses, and provides actionable feedback – saving time and hiring better.
            </p>
            <div className="hero-btns">
              <button className="btn btn-primary btn-lg" onClick={onGetStarted}>
                Try AI Interview <span>→</span>
              </button>
            </div>
            <div className="hero-badges">
              <span>✦ AI-Powered</span>
              <span>✦ Role-Specific</span>
              <span>✦ Bias-Free</span>
              <span>✦ 24/7 Available</span>
            </div>
          </div>
          <div className="hero-chat-preview">
            <div className="chat-preview-card">
              <div className="chat-preview-header">
                <div className="chat-preview-avatar">🤖</div>
                <div>
                  <div className="chat-preview-name">Cortex</div>
                  <div className="chat-preview-status">● Online</div>
                </div>
              </div>
              <div className="chat-preview-messages">
                <div className="chat-prev-msg ai">
                  <p>Hello! I'm Cortex, your AI interviewer. Let's get started with your Software Engineer interview.</p>
                  <span className="chat-prev-time">10:28 AM</span>
                </div>
                <div className="chat-prev-msg user-q">
                  <p>Can you explain the difference between SQL JOIN and UNION?</p>
                  <span className="chat-prev-time">10:30 AM</span>
                </div>
                <div className="chat-prev-msg ai answer">
                  <p>JOIN combines rows from two or more tables on a related column, while UNION combines the result sets of two or more SELECT statements.</p>
                  <span className="chat-prev-time">10:32 AM ✓✓</span>
                </div>
                <div className="chat-prev-msg ai">
                  <p>Great answer! You have a good understanding of SQL concepts.</p>
                  <span className="chat-prev-time">10:33 AM</span>
                </div>
              </div>
              <div className="chat-preview-input">
                <span>Type your answer…</span>
                <div className="chat-send-btn">➤</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="section" id="features">
        <h2 className="section-title">Powerful Features</h2>
        <div className="features-grid">
          {[
            { icon: '🎙️', title: 'AI-Powered Interviews', desc: 'Conduct natural, conversational interviews tailored to the role and experience level.' },
            { icon: '📊', title: 'Smart Evaluation', desc: 'AI evaluates responses in real-time and provides scores, strengths, and improvement areas.' },
            { icon: '📋', title: 'Role-Specific Questions', desc: 'Get relevant questions curated for 500+ job roles and technologies.' },
            { icon: '📈', title: 'Detailed Reports', desc: 'Receive comprehensive interview reports and candidate insights.' },
            { icon: '⚖️', title: 'Bias-Free Hiring', desc: 'Ensure a fair and consistent evaluation process for every candidate.' },
          ].map((f, i) => (
            <div key={i} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Why Choose ─── */}
      <section className="section section-alt" id="why-choose">
        <div className="why-inner">
          <div className="why-illustration">
            <div className="why-illust-content">
              <div className="why-illust-emoji">👩‍💻</div>
              <div className="why-illust-screen">
                <div className="why-bar"></div>
                <div className="why-bar short"></div>
                <div className="why-bar"></div>
              </div>
            </div>
          </div>
          <div className="why-text">
            <h2>Why Choose Cortex?</h2>
            <ul className="why-list">
              <li><span className="why-check">✓</span> Save 70%+ time in the initial screening process</li>
              <li><span className="why-check">✓</span> Improve hire quality with structured evaluations</li>
              <li><span className="why-check">✓</span> Scale your hiring without increasing headcount</li>
              <li><span className="why-check">✓</span> Provide a great candidate experience, always</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="section" id="how-it-works">
        <h2 className="section-title">How It Works</h2>
        <div className="steps-row">
          {[
            { icon: '📄', num: '1', title: 'Upload Resume', desc: 'Upload a resume and select the target role for the interview.' },
            { icon: '🤖', num: '2', title: 'AI Conducts Interview', desc: 'Our AI interviewer asks questions and interacts with candidates.' },
            { icon: '⚙️', num: '3', title: 'Evaluation & Scoring', desc: 'Responses are evaluated in real-time with detailed scoring.' },
            { icon: '📊', num: '4', title: 'Get Insights', desc: 'Receive reports and share feedback with your hiring team.' },
          ].map((s, i) => (
            <div key={i} className="step-card">
              <div className="step-card-icon">{s.icon}</div>
              <div className="step-card-num">{s.num}. {s.title}</div>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="cta-section">
        <div className="cta-inner">
          <div className="cta-icon">🚀</div>
          <div>
            <h2>Ready to redefine your hiring process?</h2>
            <p>Start using Cortex today and hire the best, faster.</p>
          </div>
          <button className="btn btn-white btn-lg" onClick={onGetStarted}>
            Get Started Free <span>→</span>
          </button>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="nav-logo">
              <img src="/logo.jpg" alt="Cortex" className="nav-logo-img" />
            </div>
            <p>AI-powered interviews that help you screen, evaluate, and hire the best talent.</p>
          </div>
          <div className="footer-col">
            <h4>Product</h4>
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
          </div>
          <div className="footer-col">
            <h4>Support</h4>
            <a href="#">Help Center</a>
            <a href="#">Privacy Policy</a>
          </div>
        </div>
        <div className="footer-bottom">
          © 2025 Cortex. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
