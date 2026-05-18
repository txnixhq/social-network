import { useState, useEffect } from 'react'
import AuthForm from './components/AuthForm'
import ProfilePage from './pages/ProfilePage'

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [userId, setUserId] = useState(() => localStorage.getItem('userId'))
  const [view, setView] = useState('profile') // 'profile' | 'auth'

  useEffect(() => {
    if (!token) setView('auth')
    else setView('profile')
  }, [token])

  function handleLogin(sessionToken, id) {
    localStorage.setItem('token', sessionToken)
    localStorage.setItem('userId', id)
    setToken(sessionToken)
    setUserId(id)
  }

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('userId')
    setToken(null)
    setUserId(null)
  }

  function handle401() {
    handleLogout()
  }

  if (!token || view === 'auth') {
    return <AuthForm onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <span className="text-xl font-bold text-gray-900">Social</span>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          Log out
        </button>
      </nav>

      {view === 'profile' && (
        <ProfilePage userId={userId} token={token} on401={handle401} />
      )}
    </div>
  )
}
