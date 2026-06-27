import { useState } from 'react'
import { api } from '../lib/api'
import { fmtDateTime } from '../lib/format'

export default function Profile({ user, onUserUpdate }) {
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [profileMsg, setProfileMsg] = useState({ text: '', error: false })
  const [savingProfile, setSavingProfile] = useState(false)

  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [passMsg, setPassMsg] = useState({ text: '', error: false })
  const [savingPass, setSavingPass] = useState(false)

  async function saveProfile() {
    setProfileMsg({ text: '', error: false })
    if (!name.trim() || !email.trim()) {
      setProfileMsg({ text: 'Name and email are required', error: true })
      return
    }
    setSavingProfile(true)
    try {
      const res = await api.updateProfile(name.trim(), email.trim())
      if (res.error) { setProfileMsg({ text: res.error, error: true }); return }
      setProfileMsg({ text: 'Profile updated successfully', error: false })
      const fresh = await api.me()
      onUserUpdate(fresh)
    } catch (e) {
      setProfileMsg({ text: 'Could not update profile', error: true })
    } finally {
      setSavingProfile(false)
    }
  }

  async function changePassword() {
    setPassMsg({ text: '', error: false })
    if (!currentPass || !newPass) {
      setPassMsg({ text: 'Fill in all password fields', error: true }); return
    }
    if (newPass.length < 6) {
      setPassMsg({ text: 'New password must be at least 6 characters', error: true }); return
    }
    if (newPass !== confirmPass) {
      setPassMsg({ text: 'New passwords do not match', error: true }); return
    }
    setSavingPass(true)
    try {
      const res = await api.changePassword(currentPass, newPass)
      if (res.error) { setPassMsg({ text: res.error, error: true }); return }
      setPassMsg({ text: 'Password changed successfully', error: false })
      setCurrentPass(''); setNewPass(''); setConfirmPass('')
    } catch (e) {
      setPassMsg({ text: 'Could not change password', error: true })
    } finally {
      setSavingPass(false)
    }
  }

  const initials = (user.name || '?').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()

  return (
    <>
      <div className="card">
        <div className="card-head"><h2>Account</h2></div>
        <div className="card-body" style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <div className="avatar" style={{ width: 64, height: 64, fontSize: 22 }}>{initials}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{user.name}</div>
            <div style={{ color: 'var(--text-soft)', fontSize: 13, marginTop: 3 }}>{user.email}</div>
            <div style={{ marginTop: 6 }}><span className={`role-pill ${user.role}`}>{user.role}</span></div>
          </div>
        </div>
      </div>

      <div className="profile-grid">
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-head"><h2>Edit profile</h2></div>
          <div className="card-body">
            <label className="field-label">Full name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} />
            <label className="field-label">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
            <button className="btn-primary" disabled={savingProfile} onClick={saveProfile}>
              {savingProfile ? 'Saving…' : 'Save changes'}
            </button>
            {profileMsg.text && <div className={`auth-msg ${profileMsg.error ? 'error' : 'success'}`}>{profileMsg.text}</div>}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-head"><h2>Change password</h2></div>
          <div className="card-body">
            <label className="field-label">Current password</label>
            <input type="password" value={currentPass} onChange={e => setCurrentPass(e.target.value)} />
            <label className="field-label">New password</label>
            <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="at least 6 characters" />
            <label className="field-label">Confirm new password</label>
            <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} />
            <button className="btn-primary" disabled={savingPass} onClick={changePassword}>
              {savingPass ? 'Saving…' : 'Update password'}
            </button>
            {passMsg.text && <div className={`auth-msg ${passMsg.error ? 'error' : 'success'}`}>{passMsg.text}</div>}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h2>Appearance</h2></div>
        <div className="card-body" style={{ color: 'var(--text-soft)', fontSize: 13.5 }}>
          You can switch between dark and light mode using the toggle at the bottom of the sidebar.
          Your preference is saved automatically on this device.
        </div>
      </div>
    </>
  )
}
