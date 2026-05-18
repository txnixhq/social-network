import Avatar from './Avatar'

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function PostCard({ post, displayName, onLike, onDelete, onViewProfile }) {
  return (
    <article className="bg-white border border-[#E2E8F0] rounded-xl p-4 hover:border-[#CBD5E1] transition-colors">
      <div className="flex items-center gap-3 mb-3">
        <Avatar name={displayName} size={36} />
        <div className="flex-1 min-w-0">
          {onViewProfile ? (
            <button
              onClick={() => onViewProfile(post.user_id)}
              className="font-medium text-sm text-gray-900 hover:text-[#185FA5] transition-colors"
            >
              {displayName}
            </button>
          ) : (
            <span className="font-medium text-sm text-gray-900">{displayName}</span>
          )}
          <p className="text-[13px] text-gray-400">{timeAgo(post.created_at)}</p>
        </div>
      </div>

      <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed mb-3">
        {post.content}
      </p>

      <div className="flex items-center">
        <button
          onClick={() => onLike(post.id, post.liked_by_me)}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            post.liked_by_me
              ? 'text-[#185FA5] font-medium'
              : 'text-gray-400 hover:text-[#185FA5]'
          }`}
        >
          <span>{post.liked_by_me ? '♥' : '♡'}</span>
          <span className="text-[13px]">{post.like_count}</span>
        </button>

        {onDelete && (
          <button
            onClick={() => onDelete(post.id)}
            className="ml-auto text-[13px] text-gray-300 hover:text-red-400 transition-colors"
          >
            Delete
          </button>
        )}
      </div>
    </article>
  )
}
