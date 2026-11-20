import { Component, useState, type ErrorInfo, type ReactNode } from 'react'
import { isRouteErrorResponse, Link, useNavigate, useRouteError } from 'react-router-dom'
import type { Animation } from 'react-useanimations'
import alertTriangle from 'react-useanimations/lib/alertTriangle'
import explore from 'react-useanimations/lib/explore'
import wifiOff from 'react-useanimations/lib/wifiOff'
import refresh from 'react-useanimations/lib/refresh'
import home from 'react-useanimations/lib/home'
import copy from 'react-useanimations/lib/copy'
import arrowLeft from 'react-useanimations/lib/arrowLeft'
import { AnimatedControl, AnimatedIcon } from '../components/ui/AnimatedIcon'
import { Card } from '../components/ui'

type ErrorKind = 'not-found' | 'offline' | 'stale-build' | 'unexpected'

const describe = (error: unknown): { kind: ErrorKind; detail: string } => {
  if (isRouteErrorResponse(error)) {
    return { kind: error.status === 404 ? 'not-found' : 'unexpected', detail: `${error.status} ${error.statusText}`.trim() }
  }
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  if (typeof navigator !== 'undefined' && !navigator.onLine) return { kind: 'offline', detail: message }
  // After a deploy, old tabs ask for code files that no longer exist.
  if (/dynamically imported module|Importing a module script failed|Failed to fetch dynamically|ChunkLoadError/i.test(message)) return { kind: 'stale-build', detail: message }
  return { kind: 'unexpected', detail: message }
}

const copyFor: Record<ErrorKind, { title: string; body: string; animation: Animation }> = {
  'not-found': { title: "We couldn't find that page", body: 'The link may be old or mistyped. Your applications are safe.', animation: explore },
  offline: { title: "You're offline", body: 'Check your connection and try again. Nothing you saved has been lost.', animation: wifiOff },
  'stale-build': { title: 'A new version is available', body: 'JobTrail was updated while this tab was open. Reload to get the latest version.', animation: refresh },
  unexpected: { title: 'Something went wrong', body: "This part of JobTrail hit an unexpected problem. Try again, or head back to the dashboard. If it keeps happening, copy the details below when you report it.", animation: alertTriangle },
}

const actionClass = 'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-accent/60'
const primaryClass = `${actionClass} bg-accent text-on-accent shadow-glass1 hover:bg-accent-strong`
const secondaryClass = `${actionClass} border border-border/35 bg-surface-solid text-text-primary hover:bg-surface-elevated`

const ErrorView = ({ kind, detail, onRetry, onHome, onBack }: { kind: ErrorKind; detail: string; onRetry: () => void; onHome?: () => void; onBack?: () => void }) => {
  const [copied, setCopied] = useState(false)
  const content = copyFor[kind]
  const report = `JobTrail error\nPage: ${window.location.href}\nTime: ${new Date().toISOString()}\n${detail}`
  const copyDetails = async () => {
    try {
      await navigator.clipboard.writeText(report)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Card level={3} className="mx-auto w-full max-w-xl p-7 text-center sm:p-9">
      <div role="alert" aria-live="assertive">
        <div className="mx-auto grid size-20 place-items-center rounded-3xl bg-accent/10 text-accent-strong">
          <AnimatedIcon animation={content.animation} size={44} autoplay loop={kind === 'offline' ? true : 2} />
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-text-primary">{content.title}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-secondary">{content.body}</p>
      </div>

      <div className="mt-7 flex flex-wrap justify-center gap-3">
        {kind !== 'not-found' && (
          <AnimatedControl animation={refresh} size={18}>
            {(eventProps, icon) => <button type="button" {...eventProps} onClick={(event) => { eventProps.onClick(event); onRetry() }} className={primaryClass}>{icon}{kind === 'stale-build' ? 'Reload' : 'Try again'}</button>}
          </AnimatedControl>
        )}
        {onBack && (
          <AnimatedControl animation={arrowLeft} size={18}>
            {(eventProps, icon) => <button type="button" {...eventProps} onClick={(event) => { eventProps.onClick(event); onBack() }} className={kind === 'not-found' ? primaryClass : secondaryClass}>{icon}Go back</button>}
          </AnimatedControl>
        )}
        <AnimatedControl animation={home} size={18}>
          {(eventProps, icon) => onHome
            ? <button type="button" {...eventProps} onClick={(event) => { eventProps.onClick(event); onHome() }} className={secondaryClass}>{icon}Dashboard</button>
            : <Link to="/" {...eventProps} className={secondaryClass}>{icon}Dashboard</Link>}
        </AnimatedControl>
      </div>

      {kind !== 'not-found' && (
        <details className="mt-7 rounded-xl border border-border/25 bg-surface-subtle/50 p-3 text-left text-sm">
          <summary className="cursor-pointer font-medium text-text-secondary">Technical details</summary>
          <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs text-text-muted">{report}</pre>
          <AnimatedControl animation={copy} size={16} interaction="click-replay">
            {(eventProps, icon) => <button type="button" {...eventProps} onClick={(event) => { eventProps.onClick(event); void copyDetails() }} className="mt-3 inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-medium text-text-secondary outline-none hover:bg-surface-elevated focus-visible:ring-2 focus-visible:ring-accent/60">{icon}{copied ? 'Copied' : 'Copy details'}</button>}
          </AnimatedControl>
        </details>
      )}
    </Card>
  )
}

/** Route errorElement: renders inside the app shell for page errors. */
export const RouteErrorPage = () => {
  const error = useRouteError()
  const navigate = useNavigate()
  const { kind, detail } = describe(error)
  if (kind !== 'not-found') console.error(error)
  return (
    <div className="grid min-h-[60vh] place-items-center py-6">
      <ErrorView kind={kind} detail={detail} onRetry={() => window.location.reload()} onBack={() => navigate(-1)} />
    </div>
  )
}

/** Catch-all route for unknown URLs. */
export const NotFoundPage = () => {
  const navigate = useNavigate()
  return (
    <div className="grid min-h-[60vh] place-items-center py-6">
      <ErrorView kind="not-found" detail="" onRetry={() => undefined} onBack={() => navigate(-1)} />
    </div>
  )
}

/** Shown instead of a blank page when the deployment has no Supabase settings. */
export const SetupRequiredPage = ({ missing }: { missing: string[] }) => (
  <main className="grid min-h-screen place-items-center p-4">
    <Card level={3} className="mx-auto w-full max-w-xl p-7 sm:p-9">
      <div role="alert">
        <div className="grid size-16 place-items-center rounded-3xl bg-accent/10 text-accent-strong">
          <AnimatedIcon animation={alertTriangle} size={36} autoplay loop={2} />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-text-primary">JobTrail isn't connected yet</h1>
        <p className="mt-2 text-sm leading-6 text-text-secondary">This deployment was built without its Supabase settings. Add these environment variables to the hosting project and redeploy:</p>
      </div>
      <ul className="mt-4 space-y-1.5 text-sm">
        {missing.map((name) => <li key={name}><code className="rounded-lg bg-surface-subtle px-2 py-1 text-text-primary">{name}</code></li>)}
      </ul>
      <p className="mt-4 text-xs text-text-muted">Vercel's Supabase integration names (<code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>) work too. Use only the public URL and anon/publishable key, never a secret key.</p>
    </Card>
  </main>
)

/** Last-resort boundary for anything outside the router (sign-in, app start-up). */
export class AppErrorBoundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state = { error: undefined as unknown }

  static getDerivedStateFromError(error: unknown) {
    return { error }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('App crashed', error, info.componentStack)
  }

  render() {
    if (this.state.error === undefined) return this.props.children
    const { kind, detail } = describe(this.state.error)
    const home = () => {
      window.location.hash = '#/'
      window.location.reload()
    }
    return (
      <main className="grid min-h-screen place-items-center p-4">
        <ErrorView kind={kind} detail={detail} onRetry={() => window.location.reload()} onHome={home} />
      </main>
    )
  }
}
