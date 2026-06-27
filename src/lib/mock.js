const delay = (ms) => new Promise((r) => setTimeout(r, ms))
let currentUser = null
const usersData = [
  { id: 1, name: 'Administrator', email: 'admin@emora.com', password: 'admin12345', role: 'admin', created_at: '2026-06-01T08:00:00' },
  { id: 2, name: 'Budi Santoso', email: 'dosen@emora.com', password: 'password', role: 'user', created_at: '2026-06-10T10:00:00' },
  { id: 3, name: 'Siti Aminah', email: 'siti@emora.com', password: 'password', role: 'user', created_at: '2026-06-12T14:00:00' },
]
let nextClassId = 100
const classesData = [
  { id: 1, user_id: 2, name: 'TI-3A Web Programming' },
  { id: 2, user_id: 2, name: 'SI-2B Databases' },
  { id: 3, user_id: 3, name: 'TI-3A Computer Networks' },
]
let nextSessionId = 100
const sessionsData = [
  { id: 4, user_id: 2, kelas: 'TI-3A Web Programming', dosen: 'Budi Santoso', started_at: '2026-06-23T09:15:00', ended_at: '2026-06-23T09:55:00', total_captures: 84, positive_rate: 71.4, negative_rate: 28.6, avg_sentiment: 42.8 },
  { id: 3, user_id: 2, kelas: 'SI-2B Databases', dosen: 'Budi Santoso', started_at: '2026-06-22T13:00:00', ended_at: '2026-06-22T14:30:00', total_captures: 62, positive_rate: 64.5, negative_rate: 35.5, avg_sentiment: 29.0 },
  { id: 2, user_id: 3, kelas: 'TI-3A Computer Networks', dosen: 'Siti Aminah', started_at: '2026-06-21T10:30:00', ended_at: '2026-06-21T11:45:00', total_captures: 97, positive_rate: 69.1, negative_rate: 30.9, avg_sentiment: 38.2 },
  { id: 1, user_id: 2, kelas: 'TI-3A Web Programming', dosen: 'Budi Santoso', started_at: '2026-06-20T08:00:00', ended_at: '2026-06-20T09:30:00', total_captures: 99, positive_rate: 68.7, negative_rate: 31.3, avg_sentiment: 37.4 },
]
const facesData = [
  { session_id: 4, kelas: 'TI-3A Web Programming', label: 'POSITIF', timestamp: '2026-06-23T09:16:00', face_path: null },
  { session_id: 4, kelas: 'TI-3A Web Programming', label: 'NEGATIF', timestamp: '2026-06-23T09:17:00', face_path: null },
  { session_id: 3, kelas: 'SI-2B Databases', label: 'POSITIF', timestamp: '2026-06-22T13:05:00', face_path: null },
  { session_id: 3, kelas: 'SI-2B Databases', label: 'NEGATIF', timestamp: '2026-06-22T13:06:00', face_path: null },
  { session_id: 2, kelas: 'TI-3A Computer Networks', label: 'POSITIF', timestamp: '2026-06-21T10:35:00', face_path: null },
]

export async function login(email, password) { await delay(300); const u = usersData.find(x => x.email === email && x.password === password); if (!u) return { error: 'Invalid email or password' }; currentUser = u; return { message: 'Login successful', role: u.role, name: u.name } }
export async function register(name, email, password) { await delay(300); if (usersData.find(x => x.email === email)) return { error: 'Email already registered' }; if (password.length < 6) return { error: 'Password must be at least 6 characters' }; usersData.push({ id: usersData.length + 1, name, email, password, role: 'user', created_at: new Date().toISOString() }); return { message: 'Registration successful' } }
export async function logout() { currentUser = null; return { message: 'Logged out' } }
export async function me() { await delay(100); if (!currentUser) { const e = new Error('Not logged in'); e.status = 401; throw e }; const { password, ...safe } = currentUser; return safe }
export async function updateProfile(name, email) { await delay(200); if (currentUser) { currentUser.name = name; currentUser.email = email }; return { message: 'Profile updated' } }
export async function changePassword(current, next) { await delay(200); if (!currentUser || currentUser.password !== current) return { error: 'Current password is incorrect' }; currentUser.password = next; return { message: 'Password changed' } }
export async function classes() { await delay(150); if (!currentUser) return { classes: [] }; return { classes: classesData.filter(c => c.user_id === currentUser.id).map(({ id, name }) => ({ id, name })) } }
export async function addClass(name) { await delay(150); const n = (name||'').trim(); if (!n) return { error: 'Empty' }; const c = { id: ++nextClassId, user_id: currentUser.id, name: n }; classesData.push(c); return { id: c.id, name: c.name } }
export async function startSession(classId) { await delay(200); return { session_id: ++nextSessionId } }
export async function detect() { await delay(150); const total = 10 + Math.floor(Math.random() * 6); const pos = Math.floor(total * (0.55 + Math.random() * 0.25)); const neg = total - pos; const pct = Math.round((pos / total) * 100); const faces = Array.from({ length: Math.min(total, 5) }, (_, i) => ({ track_id: i + 1, box: [50 + i * 80, 50, 120 + i * 80, 140], status: i < pos ? 'POSITIF' : 'NEGATIF', confidence: +(0.6 + Math.random() * 0.35).toFixed(3) })); return { total_mahasiswa: total, positif_count: pos, negatif_count: neg, kelas_status: pct >= 60 ? 'POSITIF' : 'NEGATIF', persen_positif: pct, faces } }
export async function stopSession(sid) { await delay(200); const s = { total_captures: 80, positive_rate: 70, negative_rate: 30, avg_sentiment: 40 }; if (currentUser) sessionsData.unshift({ id: sid, user_id: currentUser.id, kelas: classesData.find(c => c.user_id === currentUser.id)?.name || 'Class', dosen: currentUser.name, started_at: new Date().toISOString(), ended_at: new Date().toISOString(), ...s }); return { message: 'Session stopped', summary: s } }
export async function sessions() { await delay(200); if (!currentUser) return { sessions: [] }; return { sessions: currentUser.role === 'admin' ? sessionsData : sessionsData.filter(s => s.user_id === currentUser.id) } }
export async function faces(opts = {}) { await delay(200); let list = facesData; if (currentUser?.role !== 'admin') { const my = new Set(sessionsData.filter(s => s.user_id === currentUser?.id).map(s => s.kelas)); list = list.filter(f => my.has(f.kelas)) }; if (opts.kelas) list = list.filter(f => f.kelas === opts.kelas); if (opts.sessionId) list = list.filter(f => f.session_id === Number(opts.sessionId)); return { faces: list } }
export async function users() { await delay(200); return { users: usersData.map(({ password, ...u }) => u) } }
export async function deleteUser(id) { await delay(150); const i = usersData.findIndex(u => u.id === id && u.role !== 'admin'); if (i >= 0) usersData.splice(i, 1); return { message: 'User deleted' } }
export async function deleteSession(id) { await delay(150); const i = sessionsData.findIndex(s => s.id === id); if (i >= 0) sessionsData.splice(i, 1); return { message: 'Session deleted' } }
export async function downloadCsv(kind) { await delay(100); alert(`[Mock] Would download ${kind} CSV`); }
