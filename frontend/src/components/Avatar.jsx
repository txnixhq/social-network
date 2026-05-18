export default function Avatar({ name, size = 36 }) {
  const initial = (name || '?')[0].toUpperCase()
  return (
    <div
      className="flex items-center justify-center shrink-0 rounded-full bg-[#E6F1FB] text-[#185FA5] font-semibold select-none"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {initial}
    </div>
  )
}
