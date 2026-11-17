import { useEffect, useState } from 'react'
import { FileText, UploadCloud } from 'lucide-react'
import { Button, Card, EmptyState, Input, Skeleton } from '../components/ui'
import { listResumeVersions, uploadResumeVersion } from '../services/resumes'
import type { ResumeVersion } from '../types/job'

export const DocumentsPage = () => {
  const [resumes, setResumes] = useState<ResumeVersion[]>([])
  const [label, setLabel] = useState('')
  const [file, setFile] = useState<File>()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  const refresh = () => void listResumeVersions().then(setResumes).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load resumes.')).finally(() => setLoading(false))
  useEffect(refresh, [])

  const upload = async () => {
    if (!file || !label.trim()) {
      setError('Enter a label and choose a PDF or DOCX file.')
      return
    }
    setBusy(true)
    setError(undefined)
    try {
      await uploadResumeVersion(label.trim(), file)
      setLabel('')
      setFile(undefined)
      refresh()
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Unable to upload resume.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="space-y-5"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-strong">Documents</p><h1 className="mt-1 text-2xl font-semibold text-text-primary">Resume versions</h1><p className="mt-1 text-sm text-text-secondary">Keep private, labeled resume versions ready for each application.</p></div>
    <Card><div className="mb-5 flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-accent/15 text-accent-strong"><UploadCloud size={19} aria-hidden="true" /></div><div><h2 className="font-semibold text-text-primary">Upload a version</h2><p className="text-sm text-text-secondary">PDF or DOCX files up to 10 MB.</p></div></div><div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"><Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Label, e.g. Frontend v3" /><Input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => setFile(event.target.files?.[0])} className="py-2 text-sm" /><Button type="button" disabled={busy} onClick={() => void upload()}>{busy ? 'Uploading...' : 'Upload'}</Button></div>{error && <p role="alert" className="mt-3 text-sm text-rejected">{error}</p>}</Card>
    <Card><div className="mb-4 flex items-center gap-3"><FileText size={19} className="text-accent-strong" aria-hidden="true" /><h2 className="font-semibold text-text-primary">Saved versions</h2></div>{loading ? <Skeleton className="h-20" /> : resumes.length ? <ul className="space-y-2 text-sm">{resumes.map((resume) => <li key={resume.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/25 bg-surface-subtle/30 px-3 py-3"><span className="font-medium text-text-primary">{resume.label}</span><span className="truncate text-text-muted">{resume.fileName}</span></li>)}</ul> : <EmptyState icon={FileText} title="No resume versions yet" description="Upload your first resume version to link it to applications." />}</Card>
  </div>
}
