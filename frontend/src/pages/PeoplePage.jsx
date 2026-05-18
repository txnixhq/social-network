import { useState, useEffect } from 'react'
import Avatar from '../components/Avatar'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function PeoplePage({ token, on401, onViewProfile }) {
  const [users, setUsers] = useState([])
  const [followingSet, setFollowingSet] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(null)

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
    <div className="max-w-[600px] mx-auto px-4 py-8">
      <h2 className="text-base font-semibold text-gray-900 mb-4">People</h2>

      {users.length === 0 ? (
        <p className="text-sm text-gray-400">No other users yet.</p>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 hover:border-[#CBD5E1] transition-colors"
            >
              <Avatar name={user.display_name} size={36} />

              <button
                onClick={() => onViewProfile(user.id)}
                className="flex-1 text-left min-w-0"
              >
                <p className="font-medium text-sm text-gray-900 hover:text-[#185FA5] transition-colors">
                  {user.display_name}
                </p>
                {user.bio && (
                  <p className="text-[13px] text-gray-400 truncate mt-0.5">{user.bio}</p>
                )}
              </button>

              <button
                onClick={(e) => handleFollowToggle(e, user.id)}
                disabled={toggling === user.id}
                className={`shrink-0 text-sm font-medium rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 ${
                  followingSet.has(user.id)
                    ? 'border border-[#185FA5] text-[#185FA5] hover:border-red-400 hover:text-red-500'
                    : 'bg-[#185FA5] text-white hover:bg-[#1450A3]'
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
