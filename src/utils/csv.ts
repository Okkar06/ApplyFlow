const DANGEROUS_START = /^[=+\-@\t\r]/

export const sanitizeCsvCell = (cell: string): string => {
  if (DANGEROUS_START.test(cell)) return `'${cell}`
  return cell
}

export const toCsv = (rows: Array<Record<string, string | number | undefined>>): string => {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const body = rows.map((row) =>
    headers
      .map((header) => sanitizeCsvCell(String(row[header] ?? '')).replaceAll('"', '""'))
      .map((cell) => `"${cell}"`)
      .join(','),
  )
  return [headers.join(','), ...body].join('\n')
}

export const parseCsv = (text: string, maxRows = 1000): string[][] => {
  const lines = text.split(/\r?\n/).filter(Boolean).slice(0, maxRows + 1)
  if (lines.length > maxRows) throw new Error('CSV row limit exceeded')
  return lines.map((line) => line.split(',').map((part) => part.trim().replace(/^"|"$/g, '')))
}
