import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { USE_MOCK } from '../config'

export default function Login({ onLogin }) {
  const [tab, setTab] = useState('login')
  const [msg, setMsg] = useState({ text: '', error: false })
  const navigate = useNavigate()

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPass, setLoginPass] = useState('')
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPass, setRegPass] = useState('')

  async function handleLogin() {
    setMsg({ text: '', error: false })
    const res = await api.login(loginEmail, loginPass)
    if (res.error) { setMsg({ text: res.error, error: true }); return }
    const me = await api.me()
    onLogin(me)
    navigate(res.role === 'admin' ? '/admin' : '/')
  }

  async function handleRegister() {
    setMsg({ text: '', error: false })
    const res = await api.register(regName, regEmail, regPass)
    if (res.error) { setMsg({ text: res.error, error: true }); return }
    setMsg({ text: res.message, error: false })
    setTimeout(() => setTab('login'), 1200)
  }

  return (
    <div className="auth-body">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-glyph">E</span>
          <span className="logo-word">Emora</span>
        </div>
        <p className="auth-sub">Monitor classroom expressions in real time.</p>

        <div className="auth-tabs">
          <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setMsg({ text: '', error: false }) }}>Sign in</button>
          <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => { setTab('register'); setMsg({ text: '', error: false }) }}>Sign up</button>
        </div>

        {tab === 'login' ? (
          <div>
            <label className="field-label">Email</label>
            <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="name@email.com" />
            <label className="field-label">Password</label>
            <input type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            <button className="btn-primary" onClick={handleLogin}>Sign in</button>
          </div>
        ) : (
          <div>
            <label className="field-label">Full name</label>
            <input type="text" value={regName} onChange={e => setRegName(e.target.value)} placeholder="Your name" />
            <label className="field-label">Email</label>
            <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="name@email.com" />
            <label className="field-label">Password</label>
            <input type="password" value={regPass} onChange={e => setRegPass(e.target.value)} placeholder="at least 6 characters" />
            <button className="btn-primary" onClick={handleRegister}>Create account</button>
          </div>
        )}

        {msg.text && <div className={`auth-msg ${msg.error ? 'error' : 'success'}`}>{msg.text}</div>}

        {USE_MOCK && (
          <div className="auth-hint">
            Demo mode — sample accounts:<br />
            Admin <code>admin@emora.com</code> / <code>admin12345</code><br />
            Lecturer <code>dosen@emora.com</code> / <code>password</code>
          </div>
        )}
      </div>
    </div>
  )
}
