import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { api } from './lib/api'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Admin from './pages/Admin'

export default function App() {
  const [user, setUser] = useState(undefined) // undefined = not yet checked, null = not logged in

  useEffect(() => {
    api.me().then(setUser).catch(() => setUser(null))
  }, [])

  if (user === undefined) {
    return <div className="loading-screen">Loading…</div>
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/'} /> : <Login onLogin={setUser} />} />
      <Route path="/" element={user ? (user.role === 'admin' ? <Navigate to="/admin" /> : <Dashboard user={user} onLogout={() => setUser(null)} onUserUpdate={setUser} />) : <Navigate to="/login" />} />
      <Route path="/admin" element={user?.role === 'admin' ? <Admin user={user} onLogout={() => setUser(null)} onUserUpdate={setUser} /> : <Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
