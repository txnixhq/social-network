import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function PeoplePage({ token, on401, onViewProfile }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUsers() {
      const r = await fetch(`${API}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (r.status === 401) { on401(); return }
      const { data } = await r.json()
      setUsers(data || [])
      setLoading(false)
    }
    fetchUsers()
  }, [])

  if (loading) {
    return (
      <p className="text-center text-sm text-gray-400 py-12">Loading…</p>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">People</h2>

      {users.length === 0 ? (
        <p className="text-sm text-gray-400">No other users yet.</p>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => onViewProfile(user.id)}
              className="w-full text-left bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4 hover:border-gray-400 transition-colors"
            >
              <p className="font-semibold text-sm text-gray-900">{user.display_name}</p>
              {user.bio && (
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{user.bio}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
