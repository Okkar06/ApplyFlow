type SiteSource = 'linkedin' | 'indeed' | 'greenhouse' | 'lever' | 'workday' | 'company_site' | 'other'

const text = (value: string | null | undefined) => value?.replace(/\s+/g, ' ').trim() ?? ''

const firstText = (document: Document, selectors: string[]) => {
  for (const selector of selectors) {
    const value = text(document.querySelector(selector)?.textContent)
    if (value) return value
  }
  return ''
}

export const extractSiteFields = (document: Document, source: SiteSource) => {
  switch (source) {
    case 'linkedin':
      return {
        title: firstText(document, ['.job-details-jobs-unified-top-card__job-title', '.top-card-layout__title', 'h1']),
        company: firstText(document, ['.job-details-jobs-unified-top-card__company-name', '.topcard__org-name-link']),
        location: firstText(document, ['.job-details-jobs-unified-top-card__bullet', '.topcard__flavor--bullet']),
        description: firstText(document, ['.jobs-description__content', '.jobs-box__html-content']),
      }
    case 'indeed':
      return {
        title: firstText(document, ['h1[data-testid="jobsearch-JobInfoHeader-title"]', 'h1']),
        company: firstText(document, ['[data-testid="inlineHeader-companyName"]', '[data-testid="jobsearch-JobInfoHeader-companyName"]']),
        location: firstText(document, ['[data-testid="job-location"]', '[data-testid="inlineHeader-companyLocation"]']),
        description: firstText(document, ['#jobDescriptionText', '[data-testid="jobDescriptionText"]']),
      }
    case 'greenhouse':
      return {
        title: firstText(document, ['#header h1', '.job__title h1', 'h1']),
        company: firstText(document, ['.company-name', '[data-company-name]']),
        location: firstText(document, ['.location', '[data-location]']),
        description: firstText(document, ['#content', '.job__description']),
      }
    case 'lever':
      return {
        title: firstText(document, ['.posting-headline h2', 'h1']),
        company: firstText(document, ['.posting-headline .company', '.main-header-logo img[alt]']),
        location: firstText(document, ['.posting-categories .location', '.location']),
        description: firstText(document, ['.section-wrapper', '.posting-page']),
      }
    case 'workday':
      return {
        title: firstText(document, ['[data-automation-id="jobPostingHeader"]', 'h1']),
        company: firstText(document, ['[data-automation-id="jobPostingCompany"]']),
        location: firstText(document, ['[data-automation-id="locations"]']),
        description: firstText(document, ['[data-automation-id="jobPostingDescription"]', 'main']),
      }
    default:
      return { title: firstText(document, ['h1', '[role="heading"]']), company: '', location: '', description: text(document.body.innerText).slice(0, 50000) }
  }
}
