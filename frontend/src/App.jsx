import { useState, useEffect } from 'react'
import AuthForm from './components/AuthForm'
import Feed from './pages/Feed'
import ProfilePage from './pages/ProfilePage'
import PeoplePage from './pages/PeoplePage'

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [userId, setUserId] = useState(() => localStorage.getItem('userId'))
  const [view, setView] = useState('feed')
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

  const activeKey = view === 'user' ? 'people' : view

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <nav className="bg-white border-b border-[#E2E8F0] px-6 flex items-center justify-between h-14">
        <span className="text-lg font-semibold text-[#185FA5]">Social</span>
        <div className="flex items-center h-full">
          {navItems.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`h-full px-4 text-sm font-medium border-b-2 transition-colors ${
                activeKey === key
                  ? 'text-[#185FA5] border-[#185FA5]'
                  : 'text-gray-400 border-transparent hover:text-[#185FA5]'
              }`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={handleLogout}
            className="ml-4 text-sm text-gray-400 hover:text-[#185FA5] transition-colors"
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
          <ProfilePage
            userId={userId}
            currentUserId={userId}
            token={token}
            on401={handle401}
            isOwnProfile={true}
          />
        )}
        {view === 'people' && (
          <PeoplePage token={token} on401={handle401} onViewProfile={viewUserProfile} />
        )}
        {view === 'user' && (
          <ProfilePage
            userId={viewingUserId}
            currentUserId={userId}
            token={token}
            on401={handle401}
            isOwnProfile={false}
          />
        )}
      </main>
    </div>
  )
}
