import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function PeoplePage({ token, on401, onViewProfile }) {
  const [users, setUsers] = useState([])
  const [followingSet, setFollowingSet] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(null) // user_id currently being toggled

  useEffect(() => {
    async function fetchAll() {
      const [usersR, followsR] = await Promise.all([
        fetch(`${API}/users`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/follows`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (usersR.status === 401 || followsR.status === 401) { on401(); return }

      const { data: usersData } = await usersR.json()
      const { data: followsData } = await followsR.json()

      setUsers(usersData || [])
      setFollowingSet(new Set(followsData || []))
      setLoading(false)
    }
    fetchAll()
  }, [])

  async function handleFollowToggle(e, userId) {
    e.stopPropagation()
    const isFollowing = followingSet.has(userId)
    setToggling(userId)

    const r = await fetch(`${API}/follow/${userId}`, {
      method: isFollowing ? 'DELETE' : 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (r.status === 401) { on401(); return }
    const { error } = await r.json()

    if (!error) {
      setFollowingSet((prev) => {
        const next = new Set(prev)
        isFollowing ? next.delete(userId) : next.add(userId)
        return next
      })
    }
    setToggling(null)
  }

  if (loading) {
    return <p className="text-center text-sm text-gray-400 py-12">Loading…</p>
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">People</h2>

      {users.length === 0 ? (
        <p className="text-sm text-gray-400">No other users yet.</p>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4"
            >
              <button
                onClick={() => onViewProfile(user.id)}
                className="text-left flex-1 min-w-0 mr-4"
              >
                <p className="font-semibold text-sm text-gray-900 hover:underline">
                  {user.display_name}
                </p>
                {user.bio && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{user.bio}</p>
                )}
              </button>

              <button
                onClick={(e) => handleFollowToggle(e, user.id)}
                disabled={toggling === user.id}
                className={`shrink-0 text-sm font-medium rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 ${
                  followingSet.has(user.id)
                    ? 'border border-gray-300 text-gray-600 hover:border-red-300 hover:text-red-500'
                    : 'bg-gray-900 text-white hover:bg-gray-700'
                }`}
              >
                {toggling === user.id ? '…' : followingSet.has(user.id) ? 'Following' : 'Follow'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
