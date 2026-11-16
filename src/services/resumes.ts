import { supabase } from '../lib/supabase'
import type { ResumeVersion } from '../types/job'

type ResumeRow = {
  id: string
  label: string
  file_path: string
  file_name: string
  mime_type: ResumeVersion['mimeType']
  size_bytes: number
  is_default: boolean
  created_at: string
}

const toResume = (row: ResumeRow): ResumeVersion => ({
  id: row.id,
  label: row.label,
  filePath: row.file_path,
  fileName: row.file_name,
  mimeType: row.mime_type,
  sizeBytes: row.size_bytes,
  isDefault: row.is_default,
  createdAt: row.created_at,
})

export const listResumeVersions = async (): Promise<ResumeVersion[]> => {
  const { data, error } = await supabase.from('resume_versions').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(`Unable to load resumes: ${error.message}`)
  return (data as ResumeRow[]).map(toResume)
}

export const uploadResumeVersion = async (label: string, file: File): Promise<ResumeVersion> => {
  const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  if (!allowedTypes.includes(file.type)) throw new Error('Resume must be a PDF or DOCX file.')
  if (file.size === 0 || file.size > 10485760) throw new Error('Resume must be between 1 byte and 10 MB.')

  const user = await supabase.auth.getUser()
  if (user.error || !user.data.user) throw new Error('You must be signed in to upload a resume.')

  const path = `${user.data.user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const upload = await supabase.storage.from('resumes').upload(path, file, { upsert: false, contentType: file.type })
  if (upload.error) throw new Error(`Unable to upload resume: ${upload.error.message}`)

  const { data, error } = await supabase.from('resume_versions').insert({
    label,
    file_path: path,
    file_name: file.name,
    mime_type: file.type,
    size_bytes: file.size,
  }).select('*').single()
  if (error) {
    await supabase.storage.from('resumes').remove([path])
    throw new Error(`Unable to save resume metadata: ${error.message}`)
  }
  return toResume(data as ResumeRow)
}
