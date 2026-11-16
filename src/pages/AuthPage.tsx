import { useState } from 'react'
import type { FormEvent } from 'react'
import { GlassCard } from '../components/GlassCard'
import { supabase } from '../lib/supabase'

export const AuthPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState<string>()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError(undefined)
    setMessage(undefined)
    const result = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (result.error) {
      setError(result.error.message)
      return
    }
    if (isSignUp && !result.data.session) setMessage('Check your email to confirm your account.')
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute -left-24 top-1/4 size-72 rounded-full bg-accent/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-1/4 size-80 rounded-full bg-accent-secondary/10 blur-3xl" />
      <GlassCard className="glass-elevated relative w-full max-w-md p-7 sm:p-9">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-accent text-xl font-bold text-on-accent shadow-glass1">J</div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary">JobTrail</h1>
            <p className="text-sm text-text-muted">Your application cockpit</p>
          </div>
        </div>
        <h2 className="text-xl font-semibold text-text-primary">{isSignUp ? 'Create your account' : 'Welcome back'}</h2>
        <p className="mt-2 text-sm leading-6 text-text-secondary">{isSignUp ? 'Start turning applications into a clear, searchable system.' : 'Sign in to continue tracking your opportunities.'}</p>
        <form className="mt-7 grid gap-4" onSubmit={submit}>
          <label className="grid gap-1.5 text-sm font-medium text-text-secondary">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="rounded-xl border border-border/40 bg-surface-solid px-3.5 py-3 text-text-primary placeholder:text-text-muted" /></label>
          <label className="grid gap-1.5 text-sm font-medium text-text-secondary">Password<input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="rounded-xl border border-border/40 bg-surface-solid px-3.5 py-3 text-text-primary placeholder:text-text-muted" /></label>
          <button disabled={busy} className="mt-2 rounded-xl bg-accent px-4 py-3 font-semibold text-on-accent shadow-glass1 hover:-translate-y-0.5 hover:bg-accent-strong disabled:translate-y-0 disabled:opacity-50">{busy ? 'Working...' : isSignUp ? 'Create account' : 'Sign in'}</button>
        </form>
        {error && <p role="alert" className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        {message && <p className="mt-4 rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">{message}</p>}
        <button type="button" onClick={() => setIsSignUp((value) => !value)} className="mt-6 text-sm text-text-secondary underline decoration-border/70 underline-offset-4 hover:text-text-primary">
          {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
        </button>
      </GlassCard>
    </main>
  )
}
