import { useEffect, useRef, useState } from 'react'
import type { SearchResult } from '../api/types'

export default function SearchBar({ onSelect }: { onSelect: (r: SearchResult) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    if (query.trim().length < 3) {
      setResults([])
      return
    }
    setLoading(true)
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`,
          { headers: { 'Accept-Language': 'en' } },
        )
        setResults(await res.json())
        setOpen(true)
      } finally {
        setLoading(false)
      }
    }, 500)
  }, [query])

  return (
    <div className="relative w-full max-w-md">
      <div className="flex items-center gap-2 rounded-full bg-white/95 px-4 py-2.5 shadow-lg ring-1 ring-stone-200 backdrop-blur">
        <span className="text-stone-400">🔍</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search places…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400"
        />
        {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-rose-300 border-t-transparent" />}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-[1000] mt-2 w-full overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-stone-200">
          {results.map((r, i) => (
            <button
              key={i}
              className="block w-full px-4 py-2.5 text-left text-sm hover:bg-rose-50"
              onClick={() => {
                onSelect(r)
                setOpen(false)
              }}
            >
              {r.display_name.split(',').slice(0, 3).join(',')}
              <span className="block text-xs text-stone-400">{r.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
