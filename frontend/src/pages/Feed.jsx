import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function Feed({ token, userId, on401, onViewProfile }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState(null)

  useEffect(() => {
    fetchFeed()
  }, [])

  async function fetchFeed() {
    setLoading(true)
    const r = await fetch(`${API}/feed`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (r.status === 401) { on401(); return }
    const { data } = await r.json()
    setPosts(data || [])
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

    if (error) {
      setPostError(error)
    } else {
      setContent('')
      await fetchFeed()
    }
    setPosting(false)
  }

  async function handleDelete(postId) {
    const r = await fetch(`${API}/posts/${postId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (r.status === 401) { on401(); return }
    setPosts((prev) => prev.filter((p) => p.id !== postId))
  }

  async function handleLike(postId, liked) {
    // Optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, liked_by_me: !liked, like_count: p.like_count + (liked ? -1 : 1) }
          : p
      )
    )

    const r = await fetch(`${API}/likes/${postId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (r.status === 401) { on401(); return }
    // If it failed, revert
    const { error } = await r.json()
    if (error) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, liked_by_me: liked, like_count: p.like_count + (liked ? 1 : -1) }
            : p
        )
      )
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      {/* Composer */}
      <form onSubmit={handlePost} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-6">
        <textarea
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none"
        />
        {postError && <p className="text-xs text-red-600 mb-2">{postError}</p>}
        <div className="flex justify-end border-t border-gray-100 pt-3 mt-1">
          <button
            type="submit"
            disabled={posting || !content.trim()}
            className="bg-gray-900 text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            {posting ? 'Posting…' : 'Post'}
          </button>
        </div>
      </form>

      {/* Feed */}
      {loading ? (
        <p className="text-center text-sm text-gray-400 py-12">Loading…</p>
      ) : posts.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-12">No posts yet. Be the first!</p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <article
              key={post.id}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => onViewProfile(post.user_id)}
                  className="font-semibold text-sm text-gray-900 hover:underline"
                >
                  {post.display_name}
                </button>
                <span className="text-xs text-gray-400">{timeAgo(post.created_at)}</span>
              </div>

              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed mb-4">
                {post.content}
              </p>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleLike(post.id, post.liked_by_me)}
                  className={`flex items-center gap-1.5 text-sm transition-colors ${
                    post.liked_by_me
                      ? 'text-rose-500 font-medium'
                      : 'text-gray-400 hover:text-rose-400'
                  }`}
                >
                  <span>{post.liked_by_me ? '♥' : '♡'}</span>
                  <span>{post.like_count}</span>
                </button>

                {post.user_id === userId && (
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="text-xs text-gray-300 hover:text-red-400 transition-colors ml-auto"
                  >
                    Delete
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
