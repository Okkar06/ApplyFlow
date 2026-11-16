import { useEffect, useState } from 'react'
import { GlassCard } from '../components/GlassCard'
import { listResumeVersions, uploadResumeVersion } from '../services/resumes'
import type { ResumeVersion } from '../types/job'

export const DocumentsPage = () => {
  const [resumes, setResumes] = useState<ResumeVersion[]>([])
  const [label, setLabel] = useState('')
  const [file, setFile] = useState<File>()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const refresh = () => void listResumeVersions().then(setResumes).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load resumes.'))
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

  return <GlassCard><h2 className="text-lg font-semibold">Resume versions</h2><p className="mt-2 text-sm text-slate-300">Private PDF and DOCX files can be linked to each application.</p>
    <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]"><input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Label, e.g. Frontend v3" className="rounded-lg bg-black/20 px-3 py-2" /><input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => setFile(event.target.files?.[0])} className="rounded-lg bg-black/20 px-3 py-2 text-sm" /><button type="button" disabled={busy} onClick={() => void upload()} className="rounded-lg bg-teal-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-50">{busy ? 'Uploading...' : 'Upload'}</button></div>
    {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
    <ul className="mt-5 space-y-2 text-sm">{resumes.map((resume) => <li key={resume.id} className="rounded-lg border border-white/10 px-3 py-2">{resume.label} <span className="text-slate-400">({resume.fileName})</span></li>)}</ul>
  </GlassCard>
}
