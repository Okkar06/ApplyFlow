import { Settings } from 'lucide-react'
import { Card, EmptyState } from '../components/ui'

export const ProfilePage = () => (
  <div className="space-y-5">
    <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-strong">Workspace</p><h1 className="mt-1 text-2xl font-semibold text-text-primary">Profile & settings</h1><p className="mt-1 text-sm text-text-secondary">Manage skills, targets, data export, and account settings.</p></div>
    <Card><EmptyState icon={Settings} title="Profile settings are coming next" description="Your profile preferences and data controls will live here." /></Card>
  </div>
)
