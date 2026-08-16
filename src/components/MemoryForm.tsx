import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import api from '../api/client'
import type { Memory } from '../api/types'
import type { PickLocation } from './MapView'
import { CATEGORIES } from '../api/types'

export default function MemoryForm({
  location,
  editing,
  onClose,
  onSaved,
}: {
  location: PickLocation
  editing?: Memory | null
  onClose: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState(editing?.title ?? '')
  const [date, setDate] = useState(editing?.date ?? '')
  const [description, setDescription] = useState(editing?.description ?? '')
  const [category, setCategory] = useState<string>(editing?.category ?? 'romantic')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles) return
    const valid = Array.from(newFiles).filter((f) => /image\/(jpe?g|png|webp)/.test(f.type))
    if (valid.length !== newFiles.length) setError('Only JPG, PNG and WEBP images are allowed.')
    setFiles((prev) => [...prev, ...valid])
    setPreviews((prev) => [...prev, ...valid.map((f) => URL.createObjectURL(f))])
  }

  const removeFile = (i: number) => {
    setFiles((prev) => prev.filter((_, j) => j !== i))
    setPreviews((prev) => prev.filter((_, j) => j !== i))
  }

  const save = async () => {
    setError('')
    if (!title.trim()) {
      setError('Please give this memory a title.')
      return
    }
    setSaving(true)
    try {
      let memoryId = editing?.id
      if (editing) {
        await api.put(`/memories/${editing.id}`, {
          title,
          description,
          date: date || null,
          category,
          latitude: location.lat,
          longitude: location.lng,
          location_name: location.name ?? editing.location_name,
        })
      } else {
        const res = await api.post('/memories', {
          title,
          description,
          date: date || null,
          category,
          latitude: location.lat,
          longitude: location.lng,
          location_name: location.name ?? null,
        })
        memoryId = res.data.id
      }
      if (files.length > 0 && memoryId) {
        const form = new FormData()
        files.forEach((f) => form.append('files', f))
        await api.post(`/memories/${memoryId}/photos`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => {
            if (e.total) setProgress(Math.round((e.loaded / e.total) * 100))
          },
        })
      }
      onSaved()
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      className="flex h-full w-full flex-col overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl md:rounded-3xl nice-scroll"
    >
      <div className="mb-1 text-sm font-medium text-stone-500">📍 {location.name || 'Selected spot'}</div>
      <div className="mb-4 text-xs text-stone-400">
        {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
      </div>
      <h2 className="mb-4 text-xl font-semibold">{editing ? 'Edit Memory' : 'New Memory'}</h2>

      <label className="mb-1 text-sm font-medium">Title</label>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Our first date ❤️"
        className="mb-4 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-rose-400"
      />

      <label className="mb-1 text-sm font-medium">Date</label>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="mb-4 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-rose-400"
      />

      <label className="mb-1 text-sm font-medium">Description</label>
      <textarea
        value={description ?? ''}
        onChange={(e) => setDescription(e.target.value)}
        rows={12}
        placeholder="We walked around the lake, then went to a small cafe nearby…"
        className="mb-4 w-full resize-none rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-rose-400"
      />

      <label className="mb-1 text-sm font-medium">Category</label>
      <div className="mb-4 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setCategory(c.value)}
            className={`rounded-full px-3 py-1.5 text-sm ring-1 transition ${
              category === c.value
                ? 'bg-rose-50 text-rose-600 ring-rose-300'
                : 'bg-white text-stone-600 ring-stone-200 hover:bg-stone-50'
            }`}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      <label className="mb-1 text-sm font-medium">Photos</label>
      <div className="mb-4 flex flex-wrap gap-2">
        {previews.map((p, i) => (
          <div key={i} className="relative h-20 w-20 overflow-hidden rounded-xl ring-1 ring-stone-200">
            <img src={p} alt="" className="h-full w-full object-cover" />
            <button
              onClick={() => removeFile(i)}
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white"
            >
              ×
            </button>
          </div>
        ))}
        <button
          onClick={() => fileInput.current?.click()}
          className="flex h-20 w-20 flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 text-stone-400 hover:border-rose-300 hover:text-rose-400"
        >
          <span className="text-xl">📷</span>
          <span className="text-[10px]">Add photos</span>
        </button>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => addFiles(e.target.files)}
      />

      {saving && progress > 0 && (
        <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
          <div className="h-full rounded-full bg-rose-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}

      <div className="mt-auto flex gap-3">
        <button
          onClick={onClose}
          disabled={saving}
          className="flex-1 rounded-full px-4 py-2.5 text-sm font-medium text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="flex-1 rounded-full bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-rose-600 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Memory ❤️'}
        </button>
      </div>
    </motion.div>
  )
}
