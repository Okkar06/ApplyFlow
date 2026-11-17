import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { extractSiteFields } from './siteExtractors'

const fixture = (name: string) => readFileSync(resolve(process.cwd(), 'extension', 'fixtures', `${name}.html`), 'utf8')

describe('site extractors', () => {
  const cases = [
    ['linkedin', 'linkedin', 'Frontend Engineer', 'Northstar Labs'],
    ['indeed', 'indeed', 'Product Designer', 'Acme Studio'],
    ['greenhouse', 'greenhouse', 'Backend Developer', 'Greenfield Systems'],
    ['lever', 'lever', 'Data Analyst', 'Beacon Works'],
    ['workday', 'workday', 'Security Engineer', 'Cedar Cloud'],
  ] as const

  it.each(cases)('extracts fields from the %s fixture', (_name, source, title, company) => {
    const document = new DOMParser().parseFromString(fixture(_name), 'text/html')
    expect(extractSiteFields(document, source)).toMatchObject({ title, company })
  })
})
