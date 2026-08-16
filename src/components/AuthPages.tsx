import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function AuthPage() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') await login(email, password)
      else await register(name, email, password, inviteCode)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-rose-50 via-stone-50 to-amber-50 p-6">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-xl ring-1 ring-stone-100">
        <div className="mb-6 text-center">
          <span className="text-4xl">❤️</span>
          <h1 className="mt-2 text-2xl font-semibold">Couple Memory Map</h1>
          <p className="mt-1 text-sm text-stone-500">Your places, your stories.</p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === 'register' && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
              className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-rose-400"
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-rose-400"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            minLength={6}
            className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-rose-400"
          />
          {mode === 'register' && (
            <input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Partner's invite code (optional)"
              className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-rose-400"
            />
          )}
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-rose-500 py-2.5 text-sm font-semibold text-white shadow hover:bg-rose-600 disabled:opacity-50"
          >
            {busy ? '…' : mode === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-stone-500">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="font-medium text-rose-600 hover:underline"
          >
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  )
}
