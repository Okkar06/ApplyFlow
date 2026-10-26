import type { JobInput } from '../schemas/jobInput'

export interface JobImporter {
  import(input: JobInput): Promise<JobInput>
}

export class ManualImporter implements JobImporter {
  async import(input: JobInput): Promise<JobInput> {
    return input
  }
}

export class AiUrlImporter implements JobImporter {
  async import(): Promise<JobInput> {
    throw new Error('not enabled')
  }
}

export const FEATURE_AI_IMPORT = import.meta.env.FEATURE_AI_IMPORT === 'true'
