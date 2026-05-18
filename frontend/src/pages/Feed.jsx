import { useState, useEffect } from 'react'
import PostCard from '../components/PostCard'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function Feed({ token, userId, on401, onViewProfile }) {
  const [posts, setPosts] = useState([])
  const [discoveryMode, setDiscoveryMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState(null)

  useEffect(() => { fetchFeed() }, [])

  async function fetchFeed() {
    setLoading(true)
    const r = await fetch(`${API}/feed`, { headers: { Authorization: `Bearer ${token}` } })
    if (r.status === 401) { on401(); return }
    const { data } = await r.json()
    setPosts(data?.posts || [])
    setDiscoveryMode(data?.discovery_mode ?? true)
    setLoading(false)
  }

  async function handlePost(e) {
    e.preventDefault()
    if (!content.trim()) return
    setPosting(true)
    setPostError(null)

    const r = await fetch(`${API}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content: content.trim() }),
    })
    if (r.status === 401) { on401(); return }
    const { error } = await r.json()
    if (error) { setPostError(error) } else { setContent(''); await fetchFeed() }
    setPosting(false)
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
  }

  return (
    <div className="max-w-[600px] mx-auto px-4 py-8">
      {/* Composer */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 mb-6">
        <form onSubmit={handlePost}>
          <textarea
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none"
          />
          {postError && <p className="text-xs text-red-500 mb-2">{postError}</p>}
          <div className="flex justify-end border-t border-[#E2E8F0] pt-3 mt-1">
            <button
              type="submit"
              disabled={posting || !content.trim()}
              className="bg-[#185FA5] text-white text-sm font-medium px-5 py-[6px] rounded-lg hover:bg-[#1450A3] disabled:opacity-40 transition-colors"
            >
              {posting ? 'Posting…' : 'Post'}
            </button>
          </div>
        </form>
      </div>

      {/* Discovery mode notice */}
      {!loading && discoveryMode && (
        <div className="text-sm text-[#185FA5] bg-[#E6F1FB] border border-[#BFDBF7] rounded-xl px-4 py-3 mb-6 text-center">
          Follow people to see their posts here. Showing all posts for now.
        </div>
      )}

      {/* Feed */}
      {loading ? (
        <p className="text-center text-sm text-gray-400 py-12">Loading…</p>
      ) : posts.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-12">No posts yet. Be the first!</p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              displayName={post.display_name}
              onLike={handleLike}
              onDelete={post.user_id === userId ? handleDelete : null}
              onViewProfile={onViewProfile}
            />
          ))}
        </div>
      )}
    </div>
  )
}
