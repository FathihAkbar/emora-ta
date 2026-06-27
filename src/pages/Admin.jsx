import { useEffect, useState, useMemo } from 'react'
import { api } from '../lib/api'
import { fmtDateTime } from '../lib/format'
import Shell from '../components/Shell'
import Profile from './Profile'
import { IcUsers, IcList, IcGrid, IcUser } from '../components/icons'

const NAV = [
  { id: 'overview', label: 'Overview', icon: IcGrid },
  { id: 'users', label: 'Users', icon: IcUsers },
  { id: 'sessions', label: 'All Sessions', icon: IcList },
  { id: 'profile', label: 'Profile', icon: IcUser },
]
const TITLES = {
  overview: ['Admin Overview', 'A snapshot of the whole system.'],
  users: ['Manage Users', 'Accounts registered in the system.'],
  sessions: ['All Sessions', 'Monitoring sessions across every lecturer.'],
  profile: ['Profile', 'Manage your account and preferences.'],
}

export default function Admin({ user, onLogout, onUserUpdate }) {
  const [section, setSection] = useState('overview')
  const [users, setUsers] = useState([])
  const [sessions, setSessions] = useState([])
  const [lecturerFilter, setLecturerFilter] = useState('')

  useEffect(() => { loadAll() }, [])
  async function loadAll() {
    const [u, s] = await Promise.all([api.users(), api.sessions()])
    setUsers(u.users || [])
    setSessions(s.sessions || [])
  }
  async function handleDeleteUser(id) {
    if (!confirm('Delete this user and ALL their sessions, classes, and detections?')) return
    try { await api.deleteUser(id); await loadAll() }
    catch (e) { alert('Could not delete user: ' + e.message) }
  }
  async function handleDeleteSession(id, kelas) {
    if (!confirm(`Delete this session ("${kelas}") and all its detections? This cannot be undone.`)) return
    try { await api.deleteSession(id); await loadAll() }
    catch (e) { alert('Could not delete session: ' + e.message) }
  }
  async function dl(kind) {
    try { await api.downloadCsv(kind) } catch (e) { alert('Download failed: ' + e.message) }
  }

  const lecturers = useMemo(() => users.filter(u => u.role === 'user'), [users])
  const totalSessions = sessions.length
  const activeLecturers = useMemo(() => new Set(sessions.map(s => s.dosen)).size, [sessions])

  // group sessions by dosen for "All Sessions" view
  const grouped = useMemo(() => {
    const filtered = lecturerFilter ? sessions.filter(s => s.dosen === lecturerFilter) : sessions
    const map = new Map()
    for (const s of filtered) {
      if (!map.has(s.dosen)) map.set(s.dosen, [])
      map.get(s.dosen).push(s)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [sessions, lecturerFilter])

  const [title, subtitle] = TITLES[section]

  const headRight = section === 'sessions'
    ? (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <select className="filter-select" value={lecturerFilter} onChange={e => setLecturerFilter(e.target.value)}>
          <option value="">All lecturers</option>
          {lecturers.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
        </select>
        <button className="btn-del" onClick={() => dl('sessions')}>Sessions CSV</button>
        <button className="btn-del" onClick={() => dl('detections')}>Detections CSV</button>
      </div>
    )
    : null

  return (
    <Shell user={user} onLogout={onLogout} title={title} subtitle={subtitle} nav={NAV} active={section} onNav={setSection} headRight={headRight}>

      {section === 'overview' && (
        <>
          <div className="stat-grid">
            <Stat label="Total users" value={users.length} foot={`${lecturers.length} lecturers`} chip="brand" icon="◇" />
            <Stat label="Total sessions" value={totalSessions} foot="across all lecturers" chip="pos" icon="▲" />
            <Stat label="Active lecturers" value={activeLecturers} foot="lecturers with sessions" chip="amber" icon="≈" />
          </div>

          <div className="card">
            <div className="card-head"><h2>Users</h2><span className="ch-sub">{users.length} accounts</span></div>
            <UserTable users={users} onDelete={handleDeleteUser} />
          </div>
        </>
      )}

      {section === 'users' && (
        <div className="card">
          <div className="card-head"><h2>Users</h2><span className="ch-sub">{users.length} accounts</span></div>
          <UserTable users={users} onDelete={handleDeleteUser} />
        </div>
      )}

      {section === 'sessions' && (
        <div className="card">
          <div className="card-head">
            <h2>All sessions</h2>
            <span className="ch-sub">{sessions.length} total{lecturerFilter ? ` — filtered: ${lecturerFilter}` : ''}</span>
          </div>
          {grouped.length === 0
            ? <div className="empty">No sessions yet.</div>
            : grouped.map(([dosen, list]) => (
              <div key={dosen}>
                <div className="group-header">
                  <span>{dosen}</span>
                  <span className="gh-count">{list.length} session{list.length > 1 ? 's' : ''}</span>
                </div>
                <SessionTable sessions={list} onDelete={handleDeleteSession} />
              </div>
            ))
          }
        </div>
      )}

      {section === 'profile' && <Profile user={user} onUserUpdate={onUserUpdate} />}

    </Shell>
  )
}

function Stat({ label, value, foot, chip, icon }) {
  return (
    <div className="stat">
      <div className="s-top"><span className="s-label">{label}</span><span className={`s-chip ${chip}`}>{icon}</span></div>
      <div className="s-value">{value}</div>
      <div className="s-foot">{foot}</div>
    </div>
  )
}

function UserTable({ users, onDelete }) {
  if (!users.length) return <div className="empty">No users yet.</div>
  return (
    <div className="table-wrap">
      <table className="tbl">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Action</th></tr></thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td className="strong">{u.name}</td>
              <td>{u.email}</td>
              <td><span className={`role-pill ${u.role}`}>{u.role}</span></td>
              <td>{u.role === 'admin' ? <span className="muted">—</span> : <button className="btn-del" onClick={() => onDelete(u.id)}>Delete</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SessionTable({ sessions, onDelete }) {
  return (
    <div className="table-wrap">
      <table className="tbl">
        <thead><tr><th>Class</th><th>Started</th><th>Total</th><th>Positive</th><th>Sentiment</th><th>Action</th></tr></thead>
        <tbody>
          {sessions.map(s => (
            <tr key={s.id}>
              <td className="strong">{s.kelas}</td>
              <td className="num">{fmtDateTime(s.started_at)}</td>
              <td className="num">{s.total_captures}</td>
              <td className="num">{s.positive_rate}%</td>
              <td className={`num ${s.avg_sentiment >= 0 ? 'sentiment-pos' : 'sentiment-neg'}`}>{s.avg_sentiment > 0 ? '+' : ''}{s.avg_sentiment}</td>
              <td><button className="btn-del" onClick={() => onDelete(s.id, s.kelas)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
