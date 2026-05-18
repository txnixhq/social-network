import { useState, useEffect } from 'react'
import AuthForm from './components/AuthForm'
import Feed from './pages/Feed'
import ProfilePage from './pages/ProfilePage'
import PeoplePage from './pages/PeoplePage'

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [userId, setUserId] = useState(() => localStorage.getItem('userId'))
  const [view, setView] = useState('feed') // 'feed' | 'profile' | 'people' | 'user'
  const [viewingUserId, setViewingUserId] = useState(null)

  useEffect(() => {
    if (!token) setView('feed')
  }, [token])

  function handleLogin(sessionToken, id) {
    localStorage.setItem('token', sessionToken)
    localStorage.setItem('userId', id)
    setToken(sessionToken)
    setUserId(id)
    setView('feed')
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

  function viewUserProfile(id) {
    setViewingUserId(id)
    setView('user')
  }

  if (!token) {
    return <AuthForm onLogin={handleLogin} />
  }

  const navItems = [
    { key: 'feed', label: 'Feed' },
    { key: 'profile', label: 'My Profile' },
    { key: 'people', label: 'People' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <span className="text-xl font-bold text-gray-900">Social</span>
        <div className="flex items-center gap-6">
          {navItems.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`text-sm font-medium transition-colors ${
                view === key || (view === 'user' && key === 'people')
                  ? 'text-gray-900'
                  : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
          >
            Log out
          </button>
        </div>
      </nav>

      <main>
        {view === 'feed' && (
          <Feed token={token} userId={userId} on401={handle401} onViewProfile={viewUserProfile} />
        )}
        {view === 'profile' && (
          <ProfilePage userId={userId} token={token} on401={handle401} />
        )}
        {view === 'people' && (
          <PeoplePage token={token} on401={handle401} onViewProfile={viewUserProfile} />
        )}
        {view === 'user' && (
          <ProfilePage userId={viewingUserId} token={token} on401={handle401} isOwnProfile={false} />
        )}
      </main>
    </div>
  )
}
