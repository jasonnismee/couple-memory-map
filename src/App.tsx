import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import api from './api/client'
import type { Memory, SearchResult, LoveRequest } from './api/types'
import { useAuth } from './context/AuthContext'
import { AuthProvider } from './context/AuthContext'
import AuthPage from './components/AuthPages'
import MapView from './components/MapView'
import type { PickLocation } from './components/MapView'
import SearchBar from './components/SearchBar'
import MemoryForm from './components/MemoryForm'
import { MemoryCard, MemoryDetail } from './components/MemoryDetail'
import MemoryList from './components/MemoryList'

type Panel =
  | { kind: 'none' }
  | { kind: 'form'; location: PickLocation; editing?: Memory | null }
  | { kind: 'card'; memory: Memory }
  | { kind: 'detail'; memory: Memory }
  | { kind: 'list' }

function MapApp() {
  const { user, loading, logout, refresh } = useAuth()
  const [memories, setMemories] = useState<Memory[]>([])
  const [panel, setPanel] = useState<Panel>({ kind: 'none' })
  const [picking, setPicking] = useState(false)
  const [pickLocation, setPickLocation] = useState<PickLocation | null>(null)
  const [searchPick, setSearchPick] = useState<PickLocation | null>(null)
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; zoom?: number; key: number } | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [incoming, setIncoming] = useState<LoveRequest[]>([])
  const [sentRequests, setSentRequests] = useState<LoveRequest[]>([])
  const [requestEmail, setRequestEmail] = useState('')
  const [requestMessage, setRequestMessage] = useState('')

  const loadMemories = useCallback(async () => {
    const res = await api.get('/memories')
    setMemories(res.data)
  }, [])

  useEffect(() => {
    if (user) loadMemories()
  }, [user])

  const loadLoveRequests = useCallback(async () => {
    if (!user) return
    const [inc, sent] = await Promise.all([api.get('/love-requests/incoming'), api.get('/love-requests/sent')])
    setIncoming(inc.data)
    setSentRequests(sent.data)
  }, [user])

  useEffect(() => {
    if (user) loadLoveRequests()
  }, [user])

  const sendLoveRequest = async () => {
    setRequestMessage('')
    try {
      await api.post('/love-requests', { to_email: requestEmail.trim() })
      setRequestEmail('')
      setRequestMessage('Request sent! They will see it when they log in 💕')
      await loadLoveRequests()
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setRequestMessage(typeof detail === 'string' ? detail : 'Could not send request.')
    }
  }

  const respondLoveRequest = async (id: number, accept: boolean) => {
    try {
      await api.post(`/love-requests/${id}/${accept ? 'accept' : 'decline'}`)
      setIncoming((prev) => prev.filter((r) => r.id !== id))
      await Promise.all([loadMemories(), refresh(), loadLoveRequests()])
    } catch {
      setRequestMessage('Something went wrong. Try again.')
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-stone-400">Loading…</div>
    )
  }
  if (!user) return <AuthPage />

  const startAdding = () => {
    setPanel({ kind: 'none' })
    setPicking(true)
    setPickLocation(null)
    setSearchPick(null)
  }

  const handlePick = (loc: PickLocation) => {
    setPicking(false)
    setPickLocation(loc)
    setPanel({ kind: 'form', location: loc })
  }

  const handleSearchSelect = (r: SearchResult) => {
    const loc = { lat: parseFloat(r.lat), lng: parseFloat(r.lon), name: r.display_name.split(',').slice(0, 2).join(', ') }
    setSearchPick(loc)
    setFlyTarget({ lat: loc.lat, lng: loc.lng, zoom: 15, key: Date.now() })
    setPanel({ kind: 'none' })
    setPicking(false)
    setPickLocation(null)
  }

  const openMemory = (m: Memory) => {
    setPanel({ kind: 'card', memory: m })
    setFlyTarget({ lat: m.latitude, lng: m.longitude, zoom: Math.max(15, 15), key: Date.now() })
  }

  const markerLocation = (m: Memory): PickLocation => ({
    lat: m.latitude,
    lng: m.longitude,
    name: m.location_name ?? undefined,
  })

  const coupleTitle = user.partner_name ? `${user.name} & ${user.partner_name}` : user.name

  return (
    <div className="relative h-full w-full overflow-hidden">
      <MapView
        memories={memories}
        picking={picking}
        pickLocation={pickLocation ?? searchPick}
        selectedId={panel.kind === 'card' || panel.kind === 'detail' ? panel.memory.id : null}
        flyTarget={flyTarget}
        onPick={handlePick}
        onMarkerClick={(m) => openMemory(m)}
      />

      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex items-start gap-3 p-4">
        <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-white/95 px-4 py-2.5 shadow-lg ring-1 ring-stone-200 backdrop-blur">
          <span>❤️</span>
          <span className="text-sm font-semibold">{coupleTitle}</span>
        </div>
        <div className="pointer-events-auto flex-1 flex justify-center">
          <SearchBar onSelect={handleSearchSelect} />
        </div>
        <div className="pointer-events-auto relative">
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/95 shadow-lg ring-1 ring-stone-200 backdrop-blur hover:bg-stone-50"
          >
            ⚙️
          </button>
          {settingsOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white p-4 text-sm shadow-xl ring-1 ring-stone-200">
              {user.partner_name ? (
                <div className="mb-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
                  💕 Sharing your map with <b>{user.partner_name}</b>
                </div>
              ) : (
                <div className="mb-3">
                  <p className="mb-2 text-xs font-medium text-stone-600">Send a love request 💕</p>
                  <div className="flex gap-2">
                    <input
                      value={requestEmail}
                      onChange={(e) => setRequestEmail(e.target.value)}
                      type="email"
                      placeholder="partner@email.com"
                      className="min-w-0 flex-1 rounded-lg border border-stone-200 px-2 py-1.5 text-xs outline-none focus:border-rose-400"
                    />
                    <button
                      onClick={sendLoveRequest}
                      disabled={!requestEmail.includes('@')}
                      className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-600 disabled:opacity-40"
                    >
                      Send
                    </button>
                  </div>
                  {requestMessage && <p className="mt-2 text-xs text-stone-500">{requestMessage}</p>}
                  {sentRequests.length > 0 && (
                    <p className="mt-2 text-xs text-stone-400">
                      Waiting for {sentRequests.map((r) => r.to_email).join(', ')}…
                    </p>
                  )}
                  <p className="mt-2 text-[11px] leading-snug text-stone-400">
                    Or share your invite code:
                    <span className="ml-1 select-all font-mono font-bold tracking-widest text-stone-600">{user.invite_code}</span>
                  </p>
                </div>
              )}
              {!user.drive_connected && (
                <a
                  href={(import.meta.env.VITE_API_URL || '') + '/api/drive/connect'}
                  className="mb-2 block rounded-full bg-stone-100 px-4 py-2 text-center text-xs font-medium hover:bg-stone-200"
                >
                  Connect Google Drive for photos
                </a>
              )}
              <p className="text-xs text-stone-400">{user.email}</p>
              <button
                onClick={logout}
                className="mt-2 w-full rounded-full bg-stone-100 px-4 py-2 text-xs font-medium hover:bg-stone-200"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Incoming love requests */}
      <AnimatePresence>
        {incoming.length > 0 && panel.kind !== 'form' && (
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="absolute left-1/2 top-20 z-[1300] w-[92%] max-w-sm -translate-x-1/2 rounded-3xl bg-white p-4 shadow-2xl ring-1 ring-rose-200"
          >
            {incoming.map((r) => (
              <div key={r.id}>
                <p className="text-sm">
                  <b>{r.from_user_name}</b> wants to share a memory map with you 💕
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => respondLoveRequest(r.id, true)}
                    className="flex-1 rounded-full bg-rose-500 py-2 text-xs font-semibold text-white hover:bg-rose-600"
                  >
                    Accept 💗
                  </button>
                  <button
                    onClick={() => respondLoveRequest(r.id, false)}
                    className="flex-1 rounded-full py-2 text-xs font-medium text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint banner when picking */}
      {picking && (
        <div className="absolute left-1/2 top-20 z-[1000] -translate-x-1/2 rounded-full bg-stone-900/80 px-4 py-2 text-sm text-white shadow-lg backdrop-blur">
          Tap anywhere on the map 📍
        </div>
      )}

      {/* Search result callout */}
      {searchPick && !picking && panel.kind === 'none' && (
        <div className="absolute bottom-28 left-1/2 z-[1000] -translate-x-1/2 rounded-2xl bg-white/95 px-4 py-3 text-center shadow-xl ring-1 ring-stone-200 backdrop-blur">
          <p className="text-sm font-medium">📍 {searchPick.name}</p>
          <button
            onClick={() => {
              setPanel({ kind: 'form', location: searchPick })
              setSearchPick(null)
            }}
            className="mt-2 rounded-full bg-rose-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-600"
          >
            Create Memory Here
          </button>
        </div>
      )}

      {/* Left floating buttons */}
      <div className="absolute bottom-6 left-4 z-[1000] flex flex-col gap-3">
        <button
          onClick={() => setPanel(panel.kind === 'list' ? { kind: 'none' } : { kind: 'list' })}
          className="rounded-full bg-white/95 px-4 py-2.5 text-sm font-medium shadow-lg ring-1 ring-stone-200 backdrop-blur hover:bg-stone-50"
        >
          🗂 Our Memories
        </button>
      </div>

      {/* Add memory button */}
      {!picking && (
        <button
          onClick={startAdding}
          className="absolute bottom-6 right-4 z-[1000] rounded-full bg-rose-500 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-rose-500/30 hover:bg-rose-600"
        >
          + Add Memory
        </button>
      )}

      {/* Panels: floating sidebar on desktop, bottom sheet on mobile */}
      <AnimatePresence>
        {panel.kind === 'form' && (
          <div className="absolute inset-x-0 bottom-0 z-[1200] h-[80vh] md:inset-y-6 md:left-6 md:right-auto md:h-auto md:w-[420px]">
            <MemoryForm
              location={panel.location}
              editing={panel.editing}
              onClose={() => {
                setPanel({ kind: 'none' })
                setPickLocation(null)
              }}
              onSaved={async () => {
                setPanel({ kind: 'none' })
                setPickLocation(null)
                await loadMemories()
                await refresh()
              }}
            />
          </div>
        )}
        {panel.kind === 'card' && (
          <div className="absolute bottom-24 left-1/2 z-[1200] -translate-x-1/2 md:bottom-auto md:left-auto md:right-6 md:top-20 md:translate-x-0">
            <MemoryCard
              memory={panel.memory}
              onOpen={() => {
                const fresh = memories.find((m) => m.id === panel.memory!.id)
                if (fresh) setPanel({ kind: 'detail', memory: fresh })
              }}
              onClose={() => setPanel({ kind: 'none' })}
            />
          </div>
        )}
        {panel.kind === 'detail' && (
          <div className="absolute inset-x-0 bottom-0 z-[1200] h-[80vh] md:inset-y-6 md:left-auto md:right-6 md:w-[420px] md:h-auto">
            <MemoryDetail
              memory={panel.memory}
              onClose={() => setPanel({ kind: 'none' })}
              onEdit={() =>
                setPanel({ kind: 'form', location: markerLocation(panel.memory), editing: panel.memory })
              }
              onDeleted={async () => {
                setPanel({ kind: 'none' })
                await loadMemories()
              }}
            />
          </div>
        )}
        {panel.kind === 'list' && (
          <div className="absolute inset-x-0 bottom-0 z-[1200] h-[70vh] md:inset-y-6 md:left-6 md:right-auto md:w-[360px] md:h-auto">
            <MemoryList
              memories={memories}
              onSelect={(m) => {
                setPanel({ kind: 'none' })
                openMemory(m)
              }}
              onClose={() => setPanel({ kind: 'none' })}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <MapApp />
    </AuthProvider>
  )
}
