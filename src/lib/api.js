import { API_BASE_URL, USE_MOCK } from '../config'
import * as mock from './mock'

async function call(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, { credentials: 'include', ...options })
  if (res.status === 401) { const err = new Error('Not logged in'); err.status = 401; throw err }
  return res.json()
}
function form(obj) { const fd = new FormData(); Object.entries(obj).forEach(([k, v]) => fd.append(k, v)); return fd }
function qs(params) { const u = new URLSearchParams(); Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') u.append(k, v) }); const s = u.toString(); return s ? `?${s}` : '' }

export function resolveAssetUrl(path) {
  if (!path || USE_MOCK || /^https?:\/\//i.test(path)) return path
  return `${API_BASE_URL}${path}`
}
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob); const a = document.createElement('a')
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
}

export const api = {
  async login(e, p) { return USE_MOCK ? mock.login(e, p) : call('/api/login', { method: 'POST', body: form({ email: e, password: p }) }) },
  async register(n, e, p) { return USE_MOCK ? mock.register(n, e, p) : call('/api/register', { method: 'POST', body: form({ name: n, email: e, password: p }) }) },
  async logout() { return USE_MOCK ? mock.logout() : call('/api/logout', { method: 'POST' }) },
  async me() { return USE_MOCK ? mock.me() : call('/api/me') },

  async updateProfile(name, email) { return USE_MOCK ? mock.updateProfile(name, email) : call('/api/profile/update', { method: 'POST', body: form({ name, email }) }) },
  async changePassword(current, next) { return USE_MOCK ? mock.changePassword(current, next) : call('/api/profile/password', { method: 'POST', body: form({ current_password: current, new_password: next }) }) },

  async classes() { return USE_MOCK ? mock.classes() : call('/api/classes') },
  async addClass(name) { return USE_MOCK ? mock.addClass(name) : call('/api/classes', { method: 'POST', body: form({ name }) }) },

  async startSession(classId) { return USE_MOCK ? mock.startSession(classId) : call('/api/start_session', { method: 'POST', body: form({ class_id: classId }) }) },
  async detect(sid, blob) {
    if (USE_MOCK) return mock.detect(sid, blob)
    const fd = new FormData(); fd.append('session_id', sid); fd.append('frame', blob, 'frame.jpg')
    return call('/api/detect', { method: 'POST', body: fd })
  },
  async stopSession(sid) { return USE_MOCK ? mock.stopSession(sid) : call('/api/stop_session', { method: 'POST', body: form({ session_id: sid }) }) },

  async sessions() { return USE_MOCK ? mock.sessions() : call('/api/sessions') },
  async faces(opts = {}) { return USE_MOCK ? mock.faces(opts) : call(`/api/faces${qs({ kelas: opts.kelas, session_id: opts.sessionId })}`) },

  async users() { return USE_MOCK ? mock.users() : call('/api/users') },
  async deleteUser(id) { return USE_MOCK ? mock.deleteUser(id) : call('/api/users/delete', { method: 'POST', body: form({ user_id: id }) }) },
  async deleteSession(id) { return USE_MOCK ? mock.deleteSession(id) : call('/api/sessions/delete', { method: 'POST', body: form({ session_id: id }) }) },

  async downloadCsv(kind, sessionId) {
    if (USE_MOCK) return mock.downloadCsv(kind)
    let path = kind === 'detections' ? '/api/export/detections.csv' : '/api/export/sessions.csv'
    if (sessionId) path += `?session_id=${sessionId}`
    const res = await fetch(`${API_BASE_URL}${path}`, { credentials: 'include' })
    if (!res.ok) throw new Error('Failed to download CSV')
    const blob = await res.blob()
    triggerDownload(blob, kind === 'detections' ? 'emora_detections.csv' : 'emora_sessions.csv')
  },
}
