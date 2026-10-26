export type ProfileInput = {
  skills: string[]
  salaryTargetMin?: number
  preferredModes?: string[]
  preferredLocations?: string[]
}

export type RelevanceInput = {
  jobSkills: string[]
  salaryMin?: number
  salaryMax?: number
  workMode?: string
  location?: string
}

export const calculateRuleScore = (profile: ProfileInput, job: RelevanceInput) => {
  const skillSet = new Set(profile.skills.map((s) => s.toLowerCase()))
  const jobSkills = job.jobSkills.map((s) => s.toLowerCase())
  const matchedSkills = jobSkills.filter((s) => skillSet.has(s))
  const missingSkills = jobSkills.filter((s) => !skillSet.has(s))

  const skillScore = jobSkills.length ? Math.round((matchedSkills.length / jobSkills.length) * 50) : 20
  const salaryScore = profile.salaryTargetMin && job.salaryMax && job.salaryMax >= profile.salaryTargetMin ? 25 : 10
  const modeScore = !profile.preferredModes?.length || !job.workMode || profile.preferredModes.includes(job.workMode) ? 15 : 5
  const locationScore =
    !profile.preferredLocations?.length || !job.location || profile.preferredLocations.some((l) => job.location?.toLowerCase().includes(l.toLowerCase())) ? 10 : 5

  return {
    score: Math.min(100, skillScore + salaryScore + modeScore + locationScore),
    breakdown: { skillScore, salaryScore, modeScore, locationScore },
    matchedSkills,
    missingSkills,
  }
}
