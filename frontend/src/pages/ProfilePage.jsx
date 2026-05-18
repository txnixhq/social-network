import { useState, useEffect } from 'react'
import Avatar from '../components/Avatar'
import PostCard from '../components/PostCard'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function ProfilePage({ userId, currentUserId, token, on401, isOwnProfile = true }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [following, setFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [posts, setPosts] = useState([])
  const [postsLoading, setPostsLoading] = useState(true)

  useEffect(() => {
    setEditing(false)
    setPosts([])
    fetchProfile()
    fetchPosts()
    if (!isOwnProfile) fetchFollowState()
  }, [userId, isOwnProfile])

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

  async function fetchPosts() {
    setPostsLoading(true)
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    const r = await fetch(`${API}/user-posts/${userId}`, { headers })
    if (r.status === 401) { on401(); return }
    const { data } = await r.json()
    setPosts(data || [])
    setPostsLoading(false)
  }

  async function fetchFollowState() {
    const r = await fetch(`${API}/follows`, { headers: { Authorization: `Bearer ${token}` } })
    if (r.status === 401) { on401(); return }
    const { data } = await r.json()
    setFollowing((data || []).includes(userId))
  }

  async function handleFollowToggle() {
    setFollowLoading(true)
    const r = await fetch(`${API}/follow/${userId}`, {
      method: following ? 'DELETE' : 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (r.status === 401) { on401(); return }
    const { error } = await r.json()
    if (!error) {
      const delta = following ? -1 : 1
      setFollowing(!following)
      setProfile((p) => ({ ...p, follower_count: (p.follower_count ?? 0) + delta }))
    }
    setFollowLoading(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)

    const r = await fetch(`${API}/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ display_name: displayName, bio }),
    })
    if (r.status === 401) { on401(); return }
    const { data, error } = await r.json()
    if (error) { setSaveError(error) } else { setProfile((p) => ({ ...p, ...data })); setEditing(false) }
    setSaving(false)
  }

  async function handleLike(postId, liked) {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, liked_by_me: !liked, like_count: p.like_count + (liked ? -1 : 1) } : p
      )
    )
    const r = await fetch(`${API}/likes/${postId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (r.status === 401) { on401(); return }
    const { error } = await r.json()
    if (error) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, liked_by_me: liked, like_count: p.like_count + (liked ? 1 : -1) } : p
        )
      )
    }
  }

  async function handleDelete(postId) {
    const r = await fetch(`${API}/posts/${postId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (r.status === 401) { on401(); return }
    setPosts((prev) => prev.filter((p) => p.id !== postId))
    setProfile((p) => ({ ...p, post_count: Math.max(0, (p.post_count ?? 1) - 1) }))
  }

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-gray-400 text-sm">Loading…</div>
  }
  if (!profile) {
    return <div className="flex items-center justify-center py-24 text-gray-400 text-sm">Profile not found.</div>
  }

  return (
    <div className="max-w-[600px] mx-auto px-4 py-8">
      {/* Profile card */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 mb-6">
        {!editing ? (
          <>
            <div className="flex items-start gap-4 mb-5">
              <Avatar name={profile.display_name} size={56} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {profile.display_name || 'Unnamed'}
                    </h2>
                    {profile.bio && (
                      <p className="text-sm text-gray-500 mt-0.5">{profile.bio}</p>
                    )}
                  </div>

                  {isOwnProfile ? (
                    <button
                      onClick={() => setEditing(true)}
                      className="shrink-0 text-sm font-medium text-[#185FA5] border border-[#185FA5] rounded-lg px-3 py-1.5 hover:bg-[#E6F1FB] transition-colors"
                    >
                      Edit
                    </button>
                  ) : (
                    <button
                      onClick={handleFollowToggle}
                      disabled={followLoading}
                      className={`shrink-0 text-sm font-medium rounded-lg px-4 py-1.5 transition-colors disabled:opacity-50 ${
                        following
                          ? 'border border-[#185FA5] text-[#185FA5] hover:border-red-400 hover:text-red-500'
                          : 'bg-[#185FA5] text-white hover:bg-[#1450A3]'
                      }`}
                    >
                      {followLoading ? '…' : following ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-6 text-sm text-gray-500 border-t border-[#E2E8F0] pt-4">
              <span><span className="font-semibold text-gray-900">{profile.post_count ?? 0}</span> posts</span>
              <span><span className="font-semibold text-gray-900">{profile.follower_count ?? 0}</span> followers</span>
              <span><span className="font-semibold text-gray-900">{profile.following_count ?? 0}</span> following</span>
            </div>
          </>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Edit profile</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display name</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#185FA5] focus:ring-1 focus:ring-[#185FA5]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#185FA5] focus:ring-1 focus:ring-[#185FA5] resize-none"
                placeholder="Tell people about yourself…"
              />
            </div>

            {saveError && <p className="text-sm text-red-500">{saveError}</p>}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-[#185FA5] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#1450A3] disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => { setEditing(false); setSaveError(null); setDisplayName(profile.display_name || ''); setBio(profile.bio || '') }}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Posts */}
      {postsLoading ? (
        <p className="text-center text-sm text-gray-400 py-8">Loading posts…</p>
      ) : posts.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-8">No posts yet.</p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              displayName={profile.display_name}
              onLike={handleLike}
              onDelete={isOwnProfile ? handleDelete : null}
              onViewProfile={null}
            />
          ))}
        </div>
      )}
    </div>
  )
}
