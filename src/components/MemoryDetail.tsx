import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/client'
import type { Memory } from '../api/types'
import { categoryEmoji } from '../api/types'

function fmtDate(d?: string | null) {
  if (!d) return ''
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

export function MemoryCard({ memory, onOpen, onClose }: { memory: Memory; onOpen: () => void; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 30, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="pointer-events-auto w-[320px] overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-stone-200"
    >
      <div className="relative h-40 bg-gradient-to-br from-rose-100 to-amber-50">
        {memory.photos[0] ? (
          <img src={memory.photos[0].image_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl">{categoryEmoji(memory.category)}</div>
        )}
        <button
          onClick={onClose}
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/60"
        >
          ×
        </button>
      </div>
      <div className="p-4">
        <h3 className="font-semibold leading-snug">
          {categoryEmoji(memory.category)} {memory.title}
        </h3>
        <p className="mt-1 text-xs text-stone-500">📅 {fmtDate(memory.date)}</p>
        {memory.location_name && <p className="text-xs text-stone-500">📍 {memory.location_name}</p>}
        {memory.description && (
          <p className="mt-2 line-clamp-2 text-sm text-stone-600">{memory.description}</p>
        )}
        <p className="mt-2 text-xs text-stone-400">
          {memory.photos.length > 0 ? `${memory.photos.length} photo${memory.photos.length > 1 ? 's' : ''}` : ''}
        </p>
        <button
          onClick={onOpen}
          className="mt-3 w-full rounded-full bg-rose-500 py-2 text-sm font-semibold text-white hover:bg-rose-600"
        >
          Open Memory
        </button>
      </div>
    </motion.div>
  )
}

export function MemoryDetail({
  memory,
  onClose,
  onEdit,
  onDeleted,
}: {
  memory: Memory
  onClose: () => void
  onEdit: () => void
  onDeleted: () => void
}) {
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const remove = async () => {
    await api.delete(`/memories/${memory.id}`)
    onDeleted()
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 60 }}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      className="pointer-events-auto flex h-full w-full flex-col overflow-y-auto bg-white shadow-2xl nice-scroll md:rounded-3xl md:ring-1 md:ring-stone-200"
    >
      <div className="relative h-56 shrink-0 bg-gradient-to-br from-rose-100 to-amber-50 md:rounded-t-3xl">
        {memory.photos[0] ? (
          <img src={memory.photos[0].image_url} alt="" className="h-full w-full object-cover md:rounded-t-3xl" />
        ) : (
          <div className="flex h-full items-center justify-center text-6xl">{categoryEmoji(memory.category)}</div>
        )}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/60"
        >
          ×
        </button>
      </div>

      <div className="flex-1 p-6">
        <h2 className="text-2xl font-semibold">
          {categoryEmoji(memory.category)} {memory.title}
        </h2>
        <div className="mt-2 space-y-1 text-sm text-stone-500">
          {memory.date && <p>📅 {fmtDate(memory.date)}</p>}
          {memory.location_name && <p>📍 {memory.location_name}</p>}
          <p className="font-mono text-xs">
          {memory.latitude.toFixed(5)}, {memory.longitude.toFixed(5)}
          </p>
        </div>

        {memory.description && <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-stone-700">"{memory.description}"</p>}

        <hr className="my-5 border-stone-100" />

        <h3 className="mb-3 text-sm font-semibold text-stone-500">📸 Photos</h3>
        <div className="grid grid-cols-3 gap-2">
          {memory.photos.map((p) => (
            <button key={p.id} onClick={() => setLightbox(p.image_url)} className="overflow-hidden rounded-xl ring-1 ring-stone-200">
              <img src={p.image_url} alt="" className="aspect-square w-full object-cover transition hover:scale-105" />
            </button>
          ))}
          {memory.photos.length === 0 && <p className="col-span-3 text-sm text-stone-400">No photos yet.</p>}
        </div>

        <hr className="my-5 border-stone-100" />

        <div className="space-y-0.5 text-xs text-stone-400">
          <p>Created by {memory.created_by_name || 'you'}</p>
          <p>Added {fmtDate(memory.created_at)}</p>
        </div>

        <div className="mt-5 flex gap-3 pb-4">
          <button
            onClick={onEdit}
            className="flex-1 rounded-full px-4 py-2.5 text-sm font-medium text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50"
          >
            Edit
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex-1 rounded-full bg-stone-100 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>

        {confirmDelete && (
          <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
            <p className="mb-3">Delete this memory forever?</p>
            <div className="flex gap-2">
              <button onClick={remove} className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-700">
                Yes, delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-full px-4 py-1.5 text-xs font-medium text-stone-600 ring-1 ring-stone-200 hover:bg-white"
              >
                Keep it
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 p-6"
            onClick={() => setLightbox(null)}
          >
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              src={lightbox}
              alt=""
              className="max-h-full max-w-full rounded-xl object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
