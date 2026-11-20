// Turns pasted or scraped job text (which may contain HTML) into plain text.
// Output is only ever rendered as React text, never as HTML.

/** Hard cap on how much raw input is processed at all. */
export const MAX_RAW_IMPORT_CHARS = 200_000

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', bull: '•',
  hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', middot: '·',
}

const decodeEntities = (value: string) =>
  value.replace(/&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z]{2,8});/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10)
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : ''
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match
  })

export const sanitizeImportedText = (input: unknown, maxLength = 50_000): string => {
  if (typeof input !== 'string') return ''
  let value = input.slice(0, MAX_RAW_IMPORT_CHARS)
  const looksLikeHtml = /<\/?[a-z][\s\S]*?>/i.test(value)
  if (looksLikeHtml) {
    value = value
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<(script|style|noscript|template|iframe|svg|object)\b[\s\S]*?<\/\1\s*>/gi, ' ')
      .replace(/<li\b[^>]*>/gi, '\n- ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|ul|ol|h[1-6]|tr|section|article|header|footer)\s*>/gi, '\n')
      .replace(/<[^>]*>/g, ' ')
  }
  value = decodeEntities(value)
    .replace(/\r\n?/g, '\n')
    // control characters other than tab/newline, and bidi override characters
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, '')
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return value.slice(0, maxLength)
}

/** Single-line field: collapses all whitespace and caps length. */
export const sanitizeLine = (input: unknown, maxLength: number): string =>
  sanitizeImportedText(input, MAX_RAW_IMPORT_CHARS).replace(/\s+/g, ' ').trim().slice(0, maxLength)
