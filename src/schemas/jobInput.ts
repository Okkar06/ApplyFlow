import { z } from 'zod'
import { detectSourceFromUrl, validateExternalUrl } from '../utils/url'
import { IMPORT_STATUSES, JOB_SOURCES, JOB_STATUSES } from '../types/job'

export const JobInput = z
  .object({
    company: z.string().trim().min(1).max(120),
    title: z.string().trim().min(1).max(120),
    location: z.string().trim().max(120).default(''),
    workMode: z.enum(['onsite', 'hybrid', 'remote']).default('hybrid'),
    salaryMin: z.coerce.number().int().nonnegative().optional(),
    salaryMax: z.coerce.number().int().nonnegative().optional(),
    currency: z.string().trim().max(8).default('SGD'),
    salaryPeriod: z.enum(['yearly', 'monthly']).default('yearly'),
    status: z.enum(JOB_STATUSES).default('saved'),
    appliedDate: z.string().optional(),
    deadline: z.string().optional(),
    sourceUrl: z.string().trim().max(1024).optional().refine(validateExternalUrl, 'URL must use https/http'),
    source: z.enum(JOB_SOURCES).default('manual'),
    importStatus: z.enum(IMPORT_STATUSES).default('none'),
    importError: z.string().max(2000).optional(),
    rawExtraction: z.record(z.unknown()).nullable().optional(),
    fieldProvenance: z.record(z.object({ source: z.enum(['manual', 'ai']), confidence: z.number().min(0).max(1).optional() })).nullable().optional(),
    priority: z.coerce.number().int().min(1).max(5).default(3),
    relevanceManual: z.coerce.number().int().min(1).max(5).optional(),
    notes: z.string().max(5000).optional(),
    skills: z.array(z.string().trim().min(1).max(40)).default([]),
  })
  .superRefine((value, ctx) => {
    if (value.salaryMin && value.salaryMax && value.salaryMin > value.salaryMax) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'salaryMin must be <= salaryMax', path: ['salaryMin'] })
    }
  })
  .transform((value) => ({
    ...value,
    source: value.sourceUrl ? detectSourceFromUrl(value.sourceUrl) : value.source,
  }))

export type JobInput = z.infer<typeof JobInput>
