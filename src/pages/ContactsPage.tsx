import usersAnimation from 'react-useanimations/lib/users'
import { Card, EmptyState } from '../components/ui'

export const ContactsPage = () => (
  <div className="space-y-5">
    <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-strong">Relationships</p><h1 className="mt-1 text-2xl font-semibold text-text-primary">Contacts</h1><p className="mt-1 text-sm text-text-secondary">Keep hiring contacts and interview preparation close to each opportunity.</p></div>
    <Card><EmptyState animation={usersAnimation} title="No contacts yet" description="Contacts, follow-up dates, and interview checklists will appear here as you add them." /></Card>
  </div>
)
