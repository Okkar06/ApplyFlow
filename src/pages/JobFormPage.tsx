import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { GlassCard } from '../components/GlassCard'
import { JobInput } from '../schemas/jobInput'
import type { JobInput as JobInputType } from '../schemas/jobInput'
import { FEATURE_AI_IMPORT } from '../services/importers'

export const JobFormPage = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<JobInputType>({
    resolver: zodResolver(JobInput),
    defaultValues: { status: 'saved', source: 'manual', importStatus: 'none', priority: 3, workMode: 'hybrid', currency: 'SGD', salaryPeriod: 'yearly', skills: [] },
  })

  return (
    <GlassCard>
      <h2 className="mb-3 text-lg font-semibold">Add Job</h2>
      <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit((values) => console.log(values))}>
        <label className="grid gap-1 text-sm">Company<input className="rounded-lg bg-black/20 px-3 py-2" {...register('company')} /></label>
        <label className="grid gap-1 text-sm">Title<input className="rounded-lg bg-black/20 px-3 py-2" {...register('title')} /></label>
        <label className="grid gap-1 text-sm md:col-span-2">Source URL<input className="rounded-lg bg-black/20 px-3 py-2" placeholder="https://..." {...register('sourceUrl')} /></label>
        <div className="md:col-span-2 flex gap-2">
          <button type="submit" className="rounded-lg bg-teal-500 px-4 py-2 font-medium text-slate-950">Save Job</button>
          <button type="button" disabled={!FEATURE_AI_IMPORT} className="rounded-lg border border-white/20 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50">Auto-fill with AI (coming soon)</button>
        </div>
        {errors.sourceUrl && <p className="text-sm text-red-300 md:col-span-2">{errors.sourceUrl.message}</p>}
      </form>
    </GlassCard>
  )
}
