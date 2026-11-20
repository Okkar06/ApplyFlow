import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import settingsAnimation from 'react-useanimations/lib/settings'
import copyAnimation from 'react-useanimations/lib/copy'
import checkmarkAnimation from 'react-useanimations/lib/checkmark'
import mailAnimation from 'react-useanimations/lib/mail'
import { AnimatedButton, Badge, Button, Card, EmptyState, Skeleton } from '../components/ui'
import { AnimatedIcon } from '../components/ui/AnimatedIcon'
import { createForwardingToken, deactivateForwardingToken, forwardingAddressFor, INGEST_ADDRESS, listForwardingTokens } from '../services/emailCapture'

const formatDate = (value?: string) => (value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Never')

const EmailForwardingCard = () => {
  const queryClient = useQueryClient()
  const [revealed, setRevealed] = useState<string>()
  const [copied, setCopied] = useState(false)
  const { data: tokens = [], isLoading, error } = useQuery({ queryKey: ['forwarding-tokens'], queryFn: listForwardingTokens })
  const create = useMutation({
    mutationFn: () => createForwardingToken(),
    onSuccess: (token) => {
      setRevealed(token)
      setCopied(false)
      void queryClient.invalidateQueries({ queryKey: ['forwarding-tokens'] })
    },
  })
  const deactivate = useMutation({ mutationFn: deactivateForwardingToken, onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['forwarding-tokens'] }) })

  const shown = revealed ? forwardingAddressFor(revealed) ?? revealed : undefined
  const copy = async () => {
    if (!shown) return
    try {
      await navigator.clipboard.writeText(shown)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent-strong"><AnimatedIcon animation={mailAnimation} size={20} interaction="hover" /></div>
        <div className="min-w-0">
          <h2 className="font-semibold text-text-primary">Email forwarding</h2>
          <p className="mt-1 text-sm text-text-secondary">Forward application emails (confirmations, interview invites, rejections) to your private address. JobTrail matches them to your applications and updates the status. It never reads your mailbox.</p>
        </div>
      </div>

      {!INGEST_ADDRESS && <p className="mt-4 rounded-xl border border-border/30 bg-surface-subtle/60 px-3 py-2 text-sm text-text-secondary">The forwarding domain isn't set up yet. You can still create a token now; it will become part of your address once the domain is ready.</p>}

      {shown && (
        <div className="mt-4 rounded-xl border border-offer/30 bg-offer/10 p-3" role="status">
          <p className="text-sm font-medium text-text-primary">{INGEST_ADDRESS ? 'Your forwarding address' : 'Your forwarding token'}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="min-w-0 break-all rounded-lg bg-surface-solid px-2 py-1 text-sm text-text-primary">{shown}</code>
            <AnimatedButton key={copied ? 'copied' : 'copy'} type="button" variant="secondary" animation={copied ? checkmarkAnimation : copyAnimation} interaction={copied ? 'hover-replay' : 'click-replay'} iconSize={16} onClick={() => void copy()}>{copied ? 'Copied' : 'Copy'}</AnimatedButton>
          </div>
          <p className="mt-2 text-xs text-text-secondary">Save it now. For your security it is stored only as a hash and can't be shown again.</p>
        </div>
      )}

      <div className="mt-4">
        <Button type="button" onClick={() => create.mutate()} disabled={create.isPending}>{create.isPending ? 'Creating...' : tokens.some((token) => token.active) ? 'Create another address' : 'Create forwarding address'}</Button>
        {create.error && <p role="alert" className="mt-2 text-sm text-rejected">{create.error.message}</p>}
      </div>

      <div className="mt-5">
        {isLoading ? <Skeleton className="h-16" /> : error ? <p role="alert" className="text-sm text-rejected">Unable to load forwarding addresses.</p> : tokens.length ? (
          <ul className="divide-y divide-border/20">
            {tokens.map((token) => (
              <li key={token.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0 text-sm">
                  <p className="font-medium text-text-primary">{token.label} {token.active ? <Badge>Active</Badge> : <Badge>Off</Badge>}</p>
                  <p className="text-text-muted">Created {formatDate(token.createdAt)} · Last email {formatDate(token.lastUsedAt)}</p>
                </div>
                {token.active && <Button type="button" variant="ghost" onClick={() => deactivate.mutate(token.id)} disabled={deactivate.isPending}>Turn off</Button>}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-text-muted">No forwarding addresses yet.</p>}
      </div>
    </Card>
  )
}

export const ProfilePage = () => (
  <div className="space-y-5">
    <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-strong">Workspace</p><h1 className="mt-1 text-2xl font-semibold text-text-primary">Profile & settings</h1><p className="mt-1 text-sm text-text-secondary">Manage skills, targets, data export, and account settings.</p></div>
    <EmailForwardingCard />
    <Card><EmptyState animation={settingsAnimation} title="More settings are coming next" description="Your profile preferences and data controls will live here." /></Card>
  </div>
)
