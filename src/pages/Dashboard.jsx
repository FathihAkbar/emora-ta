import { useEffect, useRef, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'
import { api, resolveAssetUrl } from '../lib/api'
import { USE_MOCK } from '../config'
import { statusLabel, statusClass, fmtDateTime, fmtTime } from '../lib/format'
import Shell from '../components/Shell'
import Profile from './Profile'
import { IcCamera, IcImage, IcList, IcUser } from '../components/icons'

const DETECT_INTERVAL_MS = 3000
const NAV = [
  { id: 'detect', label: 'Detect', icon: IcCamera },
  { id: 'moments', label: 'Captured Moments', icon: IcImage },
  { id: 'history', label: 'History', icon: IcList },
  { id: 'profile', label: 'Profile', icon: IcUser },
]
const TITLES = {
  detect: ['Detection', 'Point the camera at your class and start monitoring.'],
  moments: ['Captured Moments', 'Face snapshots captured during sessions.'],
  history: ['History', 'Past sessions — open one to see its full breakdown.'],
  profile: ['Profile', 'Manage your account and preferences.'],
}

export default function Dashboard({ user, onLogout, onUserUpdate }) {
  const [section, setSection] = useState('detect')
  const [myClasses, setMyClasses] = useState([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [addingClass, setAddingClass] = useState(false)
  const [newClassName, setNewClassName] = useState('')
  const [isDetecting, setIsDetecting] = useState(false)
  const [live, setLive] = useState({ total: 0, pos: 0, neg: 0, status: null, faces: [] })
  const [videoSize, setVideoSize] = useState({ w: 0, h: 0 })

  // sessions are only loaded after a session is completed in this login.
  // — fixes the "fresh login still shows old data" issue.
  const [sessions, setSessions] = useState([])
  const [faces, setFaces] = useState([])
  const [hasFreshResult, setHasFreshResult] = useState(false)

  const [momentsFilter, setMomentsFilter] = useState('')
  const [selectedSession, setSelectedSession] = useState(null)
  const [sessionFaces, setSessionFaces] = useState([])

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const sessionIdRef = useRef(null)
  const intervalRef = useRef(null)

  useEffect(() => { loadClasses(); loadSessions(); loadFaces() }, [])
  useEffect(() => () => stopCamera(), [])
  useEffect(() => { loadFaces() }, [momentsFilter])
  useEffect(() => { if (selectedSession) loadSessionFaces(selectedSession.id); else setSessionFaces([]) }, [selectedSession])

  async function loadClasses() {
    const res = await api.classes(); const list = res.classes || []
    setMyClasses(list)
    if (list.length && !selectedClassId) setSelectedClassId(String(list[0].id))
  }
  async function loadSessions() { const s = await api.sessions(); setSessions(s.sessions || []) }
  async function loadFaces() { const f = await api.faces({ kelas: momentsFilter || undefined }); setFaces(f.faces || []) }
  async function loadSessionFaces(sid) { const f = await api.faces({ sessionId: sid }); setSessionFaces(f.faces || []) }

  async function handleAddClass() {
    const name = newClassName.trim(); if (!name) return
    const res = await api.addClass(name)
    if (res.error) { alert(res.error); return }
    setNewClassName(''); setAddingClass(false)
    await loadClasses(); setSelectedClassId(String(res.id))
  }

  function stopCamera() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
  }

  async function start() {
    if (!selectedClassId) { alert('Select or create a class first'); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => setVideoSize({ w: videoRef.current.videoWidth, h: videoRef.current.videoHeight })
      }
      const res = await api.startSession(selectedClassId)
      if (res.error) throw new Error(res.error)
      sessionIdRef.current = res.session_id
      intervalRef.current = setInterval(sendFrame, DETECT_INTERVAL_MS)
      setIsDetecting(true)
      setLive({ total: 0, pos: 0, neg: 0, status: null, faces: [] })
    } catch (err) { alert('Could not access the camera or server: ' + err.message) }
  }

  async function sendFrame() {
    const sid = sessionIdRef.current; if (!sid) return
    let blob = null; const video = videoRef.current
    if (video && video.videoWidth) {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth; canvas.height = video.videoHeight
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
      blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.8))
    }
    try {
      const data = await api.detect(sid, blob)
      if (data.error) { console.error(data.error); return }
      setLive({ total: data.total_mahasiswa, pos: data.positif_count, neg: data.negatif_count, status: data.kelas_status, faces: data.faces || [] })
    } catch (err) { console.error(err) }
  }

  async function stop() {
    stopCamera()
    if (sessionIdRef.current) { try { await api.stopSession(sessionIdRef.current) } catch (e) {}; sessionIdRef.current = null }
    setIsDetecting(false)
    setLive({ total: 0, pos: 0, neg: 0, status: null, faces: [] })
    setHasFreshResult(true)
    await loadSessions(); await loadFaces()
  }

  const latest = hasFreshResult ? sessions[0] : null
  const trendData = [...sessions].reverse().map(s => ({ kelas: s.kelas, sentiment: s.avg_sentiment }))
  const distinctClassNames = [...new Set(sessions.map(s => s.kelas))]

  const [title, subtitle] = TITLES[section]
  const headRight = section === 'detect'
    ? <button className={`btn-primary ${isDetecting ? 'stopping' : ''}`} style={{ width: 'auto', marginTop: 0, padding: '10px 18px' }} onClick={isDetecting ? stop : start}>{isDetecting ? 'Stop Detection' : 'Start Detection'}</button>
    : (section === 'history' ? <CsvButtons /> : null)

  return (
    <Shell user={user} onLogout={onLogout} title={title} subtitle={subtitle} headRight={headRight}
      nav={NAV} active={section} onNav={setSection}>

      {section === 'detect' && (
        <>
          <div className="row">
            <div className="card">
              <div className="card-head"><h2>Camera</h2>{isDetecting && <span className="badge live">Live</span>}</div>
              <div className="card-body">
                <label className="field-label">Class</label>

                {myClasses.length === 0 && !addingClass && (
                  <div className="empty" style={{ padding: '14px 0' }}>
                    You don't have any classes yet.
                    <div style={{ marginTop: 10 }}>
                      <button className="btn-del" style={{ color: 'var(--brand-2)' }} onClick={() => setAddingClass(true)}>+ Add your first class</button>
                    </div>
                  </div>
                )}
                {myClasses.length > 0 && !addingClass && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select value={selectedClassId} disabled={isDetecting} onChange={e => setSelectedClassId(e.target.value)} style={{ flex: 1 }}>
                      {myClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    {!isDetecting && <button className="btn-del" onClick={() => setAddingClass(true)}>+ New</button>}
                  </div>
                )}
                {addingClass && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="text" value={newClassName} onChange={e => setNewClassName(e.target.value)} placeholder="e.g. TI-3A Web Programming" onKeyDown={e => e.key === 'Enter' && handleAddClass()} autoFocus />
                    <button className="btn-primary" style={{ width: 'auto', marginTop: 0, padding: '0 16px' }} onClick={handleAddClass}>Add</button>
                    <button className="btn-del" onClick={() => { setAddingClass(false); setNewClassName('') }}>Cancel</button>
                  </div>
                )}

                <div style={{ height: 14 }} />
                <div className="video-wrap">
                  {isDetecting && <span className="cam-badge">REC</span>}
                  <video ref={videoRef} autoPlay playsInline muted style={{ display: isDetecting ? 'block' : 'none' }} />
                  {isDetecting && videoSize.w > 0 && (
                    <svg className="video-overlay" viewBox={`0 0 ${videoSize.w} ${videoSize.h}`} preserveAspectRatio="none">
                      {live.faces.map(f => {
                        const [x1, y1, x2, y2] = f.box
                        const isPos = f.status === 'POSITIF'
                        const color = isPos ? 'var(--positive)' : 'var(--negative)'
                        return (
                          <g key={f.track_id}>
                            <rect x={x1} y={y1} width={x2 - x1} height={y2 - y1} fill="none" stroke={color} strokeWidth="3" rx="4" />
                            <rect x={x1} y={y1 - 22} width={Math.max(70, (statusLabel(f.status).length) * 7)} height="20" fill={color} rx="3" />
                            <text x={x1 + 5} y={y1 - 7} fill="#fff" fontSize="13" fontWeight="700" fontFamily="JetBrains Mono">{statusLabel(f.status)}</text>
                          </g>
                        )
                      })}
                    </svg>
                  )}
                  {!isDetecting && <div className="video-empty"><span className="ve-ic">◉</span>Camera is off</div>}
                </div>
                {USE_MOCK && <p className="mock-note">Demo mode: detection numbers are dummy. Real detection activates once connected to the backend.</p>}
              </div>
            </div>

            <div className="card">
              <div className="card-head"><h2>Live stats</h2></div>
              <div className="card-body">
                <div className="live-stats">
                  <div className="live-stat"><div className="v">{live.total}</div><div className="l">Detected</div></div>
                  <div className="live-stat"><div className="v pos">{live.pos}</div><div className="l">Positive</div></div>
                  <div className="live-stat"><div className="v neg">{live.neg}</div><div className="l">Negative</div></div>
                  <div className="live-stat"><div className="v">{live.status ? statusLabel(live.status) : '—'}</div><div className="l">Status</div></div>
                </div>
                <div className="chart-box">
                  {live.total > 0
                    ? <DistPie data={[{ name: 'Positive', value: live.pos }, { name: 'Negative', value: live.neg }]} />
                    : <div className="empty" style={{ paddingTop: 80 }}>Live distribution will appear here while detecting.</div>}
                </div>
              </div>
            </div>
          </div>

          {hasFreshResult && latest && (
            <div className="card">
              <div className="card-head">
                <h2>Latest result</h2>
                <span className="ch-sub">{latest.kelas}</span>
              </div>
              <div className="card-body">
                <div className="stat-grid" style={{ marginBottom: 0 }}>
                  <Stat label="Total captures" value={latest.total_captures} foot={fmtDateTime(latest.started_at)} chip="brand" icon="◇" />
                  <Stat label="Positive rate" value={latest.positive_rate + '%'} foot="this session" chip="pos" icon="▲" />
                  <Stat label="Sentiment" value={(latest.avg_sentiment > 0 ? '+' : '') + latest.avg_sentiment} foot="scale -100 to 100" chip="amber" icon="≈" />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {section === 'moments' && (
        <div className="card">
          <div className="card-head">
            <h2>Captured Moments</h2>
            <select className="filter-select" value={momentsFilter} onChange={e => setMomentsFilter(e.target.value)}>
              <option value="">All classes</option>
              {distinctClassNames.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div className="card-body">
            {faces.length === 0 ? <div className="empty">No moments captured yet.</div> : (
              <div className="faces-grid">
                {faces.map((f, i) => (
                  <div className="face-card" key={i}>
                    {f.face_path ? <img src={resolveAssetUrl(f.face_path)} alt="face" loading="lazy" /> : <div className="face-ph">{f.label === 'POSITIF' ? '🙂' : '😐'}</div>}
                    <div className="face-meta">
                      <span className={`tag ${statusClass(f.label)}`}>{statusLabel(f.label)}</span>
                      <span className="face-time">{fmtTime(f.timestamp)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {section === 'history' && (
        <>
          <div className="card">
            <div className="card-head"><h2>Sentiment trend</h2><span className="ch-sub">across sessions</span></div>
            <div className="card-body"><div className="chart-box wide"><SentimentArea data={trendData} /></div></div>
          </div>

          <div className="card">
            <div className="card-head"><h2>All sessions</h2><span className="ch-sub">{sessions.length} total — click a row for details</span></div>
            <SessionTable sessions={sessions} onSelect={setSelectedSession} selectedId={selectedSession?.id} />
          </div>

          {selectedSession && (
            <div className="card">
              <div className="card-head">
                <h2>{selectedSession.kelas}</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-del" onClick={async () => { try { await api.downloadCsv('detections', selectedSession.id) } catch (e) { alert('Download failed: ' + e.message) } }}>
                    Download this session (CSV)
                  </button>
                  <button className="btn-del" onClick={() => setSelectedSession(null)}>Close</button>
                </div>
              </div>
              <div className="card-body">
                <div className="stat-grid" style={{ marginBottom: 20 }}>
                  <Stat label="Total captures" value={selectedSession.total_captures} foot={fmtDateTime(selectedSession.started_at)} chip="brand" icon="◇" />
                  <Stat label="Positive rate" value={selectedSession.positive_rate + '%'} foot={`negative ${selectedSession.negative_rate}%`} chip="pos" icon="▲" />
                  <Stat label="Sentiment" value={(selectedSession.avg_sentiment > 0 ? '+' : '') + selectedSession.avg_sentiment} foot="scale -100 to 100" chip="amber" icon="≈" />
                </div>
                <div className="row" style={{ marginBottom: 0 }}>
                  <div><div className="chart-box"><DistPie data={[{ name: 'Positive', value: selectedSession.positive_rate }, { name: 'Negative', value: selectedSession.negative_rate }]} /></div></div>
                  <div>
                    {sessionFaces.length === 0 ? <div className="empty">No face snapshots for this session.</div> : (
                      <div className="faces-grid">
                        {sessionFaces.map((f, i) => (
                          <div className="face-card" key={i}>
                            {f.face_path ? <img src={resolveAssetUrl(f.face_path)} alt="face" loading="lazy" /> : <div className="face-ph">{f.label === 'POSITIF' ? '🙂' : '😐'}</div>}
                            <div className="face-meta">
                              <span className={`tag ${statusClass(f.label)}`}>{statusLabel(f.label)}</span>
                              <span className="face-time">{fmtTime(f.timestamp)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
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

function CsvButtons() {
  async function dl(kind) { try { await api.downloadCsv(kind) } catch (e) { alert('Download failed: ' + e.message) } }
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button className="btn-del" onClick={() => dl('sessions')}>Download Sessions (CSV)</button>
      <button className="btn-del" onClick={() => dl('detections')}>Download Detections (CSV)</button>
    </div>
  )
}

function SessionTable({ sessions, onSelect, selectedId }) {
  if (!sessions.length) return <div className="empty">No sessions yet.</div>
  return (
    <div className="table-wrap">
      <table className="tbl">
        <thead><tr><th>Class</th><th>Started</th><th>Total</th><th>Positive</th><th>Sentiment</th></tr></thead>
        <tbody>
          {sessions.map(s => (
            <tr key={s.id} onClick={() => onSelect(s)} style={{ cursor: 'pointer', background: selectedId === s.id ? 'var(--brand-soft)' : undefined }}>
              <td className="strong">{s.kelas}</td>
              <td className="num">{fmtDateTime(s.started_at)}</td>
              <td className="num">{s.total_captures}</td>
              <td className="num">{s.positive_rate}%</td>
              <td className={`num ${s.avg_sentiment >= 0 ? 'sentiment-pos' : 'sentiment-neg'}`}>{s.avg_sentiment > 0 ? '+' : ''}{s.avg_sentiment}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DistPie({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="90%" paddingAngle={3} strokeWidth={0}>
          <Cell fill="#34D399" /><Cell fill="#F87171" />
        </Pie>
        <Legend verticalAlign="bottom" iconType="circle" />
        <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

function SentimentArea({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="kelas" tick={{ fontSize: 11, fill: 'var(--text-faint)' }} tickLine={false} axisLine={false} />
        <YAxis domain={[-100, 100]} tick={{ fontSize: 11, fill: 'var(--text-faint)' }} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }} />
        <Area type="monotone" dataKey="sentiment" stroke="#8B5CF6" strokeWidth={2.5} fill="url(#grad)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
