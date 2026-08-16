import { motion } from 'framer-motion'
import type { Memory } from '../api/types'
import { categoryEmoji } from '../api/types'

export default function MemoryList({
  memories,
  onSelect,
  onClose,
}: {
  memories: Memory[]
  onSelect: (m: Memory) => void
  onClose: () => void
}) {
  const sorted = [...memories].sort((a, b) => (b.date || b.created_at).localeCompare(a.date || a.created_at))
  const groups = new Map<number, Memory[]>()
  for (const m of sorted) {
    const year = new Date(m.date || m.created_at).getFullYear()
    if (!groups.has(year)) groups.set(year, [])
    groups.get(year)!.push(m)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      className="pointer-events-auto flex h-full w-full flex-col overflow-y-auto bg-white p-6 shadow-2xl md:rounded-3xl md:ring-1 md:ring-stone-200 nice-scroll"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Our Memories ❤️</h2>
        <button onClick={onClose} className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100">
          ✕
        </button>
      </div>
      {memories.length === 0 && (
        <p className="mt-8 text-center text-sm text-stone-400">
          No memories yet.
          <br />
          Click “+ Add Memory” to place your first one 📍
        </p>
      )}
      {[...groups.entries()].map(([year, items]) => (
        <div key={year} className="mb-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">{year}</h3>
          <div className="space-y-1">
            {items.map((m) => (
              <button
                key={m.id}
                onClick={() => onSelect(m)}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left hover:bg-rose-50"
              >
                <span className="text-sm font-medium">
                  {categoryEmoji(m.category)} {m.title}
                </span>
                <span className="text-xs text-stone-400">
                  {new Date(m.date || m.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </motion.div>
  )
}
