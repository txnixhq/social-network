import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function ProfilePage({ userId, token, on401, isOwnProfile = true }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  useEffect(() => {
    fetchProfile()
  }, [userId])

  async function fetchProfile() {
    setLoading(true)
    const r = await fetch(`${API}/profile/${userId}`)
    if (r.status === 401) { on401(); return }
    const { data } = await r.json()
    setProfile(data)
    setDisplayName(data?.display_name || '')
    setBio(data?.bio || '')
    setLoading(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)

    const r = await fetch(`${API}/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ display_name: displayName, bio }),
    })

    if (r.status === 401) { on401(); return }
    const { data, error } = await r.json()

    if (error) {
      setSaveError(error)
    } else {
      setProfile((p) => ({ ...p, ...data }))
      setEditing(false)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 text-sm">
        Loading…
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 text-sm">
        Profile not found.
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        {!editing ? (
          <>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {profile.display_name || 'Unnamed'}
                </h2>
                {profile.bio && (
                  <p className="text-gray-500 text-sm mt-1">{profile.bio}</p>
                )}
              </div>
              {isOwnProfile && (
                <button
                  onClick={() => setEditing(true)}
                  className="text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:text-gray-800 hover:border-gray-400 transition-colors"
                >
                  Edit
                </button>
              )}
            </div>

            <div className="flex gap-6 text-sm text-gray-500 border-t border-gray-100 pt-4 mt-4">
              <span>
                <span className="font-semibold text-gray-900">{profile.post_count ?? 0}</span> posts
              </span>
              <span>
                <span className="font-semibold text-gray-900">{profile.follower_count ?? 0}</span> followers
              </span>
              <span>
                <span className="font-semibold text-gray-900">{profile.following_count ?? 0}</span> following
              </span>
            </div>
          </>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Edit profile</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display name
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                placeholder="Tell people about yourself…"
              />
            </div>

            {saveError && <p className="text-sm text-red-600">{saveError}</p>}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false)
                  setSaveError(null)
                  setDisplayName(profile.display_name || '')
                  setBio(profile.bio || '')
                }}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
