import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button, Card, Input } from '../components/ui'
import { supabase } from '../lib/supabase'
import { authRedirectUrl } from '../lib/authRedirect'

// Google's "G" mark. Its four brand colours are required by Google's sign-in
// branding rules, so this is the one deliberate exception to theme tokens.
const GoogleMark = () => (
  <svg aria-hidden="true" viewBox="0 0 48 48" className="size-5 shrink-0">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
)

export const AuthPage = ({ initialError }: { initialError?: string }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState<string>()
  const [error, setError] = useState<string | undefined>(initialError)
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError(undefined)
    setMessage(undefined)
    const result = isSignUp
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: authRedirectUrl() } })
      : await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (result.error) {
      setError(result.error.message)
      return
    }
    if (isSignUp && !result.data.session) setMessage('Check your email to confirm your account.')
  }

  const signInWithGoogle = async () => {
    setBusy(true)
    setError(undefined)
    setMessage(undefined)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: authRedirectUrl(), queryParams: { prompt: 'select_account' } },
    })
    // On success the browser navigates to Google, so only errors land here.
    if (oauthError) {
      setBusy(false)
      setError(oauthError.message)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute -left-24 top-1/4 size-72 rounded-full bg-accent/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-1/4 size-80 rounded-full bg-accent/10 blur-3xl" />
      <Card level={3} className="relative w-full max-w-md p-7 sm:p-9">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-accent text-xl font-bold text-on-accent shadow-glass1">J</div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary">JobTrail</h1>
            <p className="text-sm text-text-muted">Your application cockpit</p>
          </div>
        </div>
        <h2 className="text-xl font-semibold text-text-primary">{isSignUp ? 'Create your account' : 'Welcome back'}</h2>
        <p className="mt-2 text-sm leading-6 text-text-secondary">{isSignUp ? 'Start turning applications into a clear, searchable system.' : 'Sign in to continue tracking your opportunities.'}</p>
        <Button type="button" variant="secondary" disabled={busy} onClick={() => void signInWithGoogle()} className="mt-7 flex w-full items-center justify-center gap-3 py-3">
          <GoogleMark />
          Continue with Google
        </Button>
        <div className="mt-6 flex items-center gap-3 text-xs uppercase tracking-wide text-text-muted" aria-hidden="true">
          <span className="h-px flex-1 bg-border/30" />or use email<span className="h-px flex-1 bg-border/30" />
        </div>
        <form className="mt-6 grid gap-4" onSubmit={submit}>
          <label className="grid gap-1.5 text-sm font-medium text-text-secondary">Email<Input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label className="grid gap-1.5 text-sm font-medium text-text-secondary">Password<Input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <Button type="submit" disabled={busy} className="mt-2 w-full py-3">{busy ? 'Working...' : isSignUp ? 'Create account' : 'Sign in'}</Button>
        </form>
        {error && <p role="alert" className="mt-4 rounded-xl border border-rejected/30 bg-rejected/10 px-3 py-2 text-sm text-rejected">{error}</p>}
        {message && <p className="mt-4 rounded-xl border border-offer/30 bg-offer/10 px-3 py-2 text-sm text-offer">{message}</p>}
        <button type="button" onClick={() => setIsSignUp((value) => !value)} className="mt-6 text-sm text-text-secondary underline decoration-border/70 underline-offset-4 hover:text-text-primary">
          {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
        </button>
      </Card>
    </main>
  )
}
