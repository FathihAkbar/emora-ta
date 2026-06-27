import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { IcSun, IcMoon } from './icons'

export default function Shell({ user, onLogout, title, subtitle, headRight, nav, active, onNav, children }) {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('emora_theme') || 'dark')
  const initials = (user?.name || '?').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('emora_theme', theme)
  }, [theme])

  async function signOut() { await api.logout(); onLogout(); navigate('/login') }
  function goHome() { navigate('/') }
  function toggleTheme() { setTheme(t => t === 'dark' ? 'light' : 'dark') }

  return (
    <div className={`shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-logo" onClick={goHome} style={{ cursor: 'pointer' }} title="Home">
          <span className="logo-glyph">E</span>
          {!collapsed && <span className="logo-word">Emora</span>}
        </div>
        <button className="collapse-btn" onClick={() => setCollapsed(c => !c)} title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? '▶' : '◀'}
        </button>

        {!collapsed && <div className="nav-section">Menu</div>}
        {nav.map(item => (
          <button key={item.id} className={`nav-item ${active === item.id ? 'active' : ''}`} onClick={() => onNav(item.id)} title={item.label}>
            <item.icon className="ic" />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}

        <div className="sidebar-foot">
          <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}>
            {theme === 'dark' ? <IcSun className="ic" /> : <IcMoon className="ic" />}
            {!collapsed && <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}
          </button>
          {!collapsed && (
            <div className="sidebar-user">
              <div className="avatar">{initials}</div>
              <div><div className="su-name">{user.name}</div><div className="su-role">{user.role}</div></div>
            </div>
          )}
          <button className="btn-signout" onClick={signOut}>{collapsed ? '↪' : 'Sign out'}</button>
        </div>
      </aside>
      <div className="content">
        <header className="content-head">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
            {headRight}
          </div>
        </header>
        <div className="content-body">{children}</div>
      </div>
    </div>
  )
}
