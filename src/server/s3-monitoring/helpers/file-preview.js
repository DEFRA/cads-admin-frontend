// The backend reads at most this many rows per request
export const maxLinesPerRequest = 1000
export const defaultLineCount = 200

// Very long lines (e.g. minified JSON) are cut short so the page stays responsive
export const maxLineChars = 10000

export const previewFormats = {
  auto: 'Detect from file name',
  plain: 'Plain text',
  csv: 'CSV',
  tsv: 'TSV',
  json: 'JSON',
  xml: 'XML'
}

const formatsByExtension = {
  csv: 'csv',
  tsv: 'tsv',
  json: 'json',
  jsonl: 'json',
  ndjson: 'json',
  geojson: 'json',
  xml: 'xml',
  xsd: 'xml',
  xsl: 'xml',
  xslt: 'xml',
  svg: 'xml'
}

const binaryExtensions = new Set([
  '7z',
  'avi',
  'avro',
  'bin',
  'bmp',
  'bz2',
  'class',
  'dll',
  'doc',
  'docx',
  'eot',
  'exe',
  'gif',
  'gpg',
  'gz',
  'ico',
  'jar',
  'jpeg',
  'jpg',
  'mov',
  'mp3',
  'mp4',
  'orc',
  'otf',
  'parquet',
  'pdf',
  'pgp',
  'png',
  'ppt',
  'pptx',
  'rar',
  'so',
  'sqlite',
  'tar',
  'tgz',
  'tif',
  'tiff',
  'ttf',
  'wav',
  'webp',
  'woff',
  'woff2',
  'xls',
  'xlsx',
  'zip'
])

function extensionOf(key = '') {
  const name = key.slice(key.lastIndexOf('/') + 1)
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
}

export function isBinaryKey(key) {
  return binaryExtensions.has(extensionOf(key))
}

/**
 * @param {string} key
 * @returns {'plain' | 'csv' | 'tsv' | 'json' | 'xml'}
 */
export function detectFormat(key) {
  return formatsByExtension[extensionOf(key)] ?? 'plain'
}

const replacementChar = String.fromCodePoint(0xfffd)

/**
 * Text decoded from binary content shows NUL characters or a high share of
 * UTF-8 replacement characters.
 *
 * @param {string[]} lines
 */
export function looksBinary(lines) {
  let total = 0
  let replaced = 0

  for (const line of lines) {
    if (line.includes('\u0000')) {
      return true
    }
    total += line.length
    replaced += line.split(replacementChar).length - 1
  }

  return total > 0 && replaced / total > 0.1
}

/**
 * Drops carriage returns left by CRLF line endings and cuts very long lines.
 *
 * @param {string[]} rows
 */
export function normaliseLines(rows) {
  let truncated = false

  const lines = rows.map((row) => {
    const line = row.endsWith('\r') ? row.slice(0, -1) : row
    if (line.length > maxLineChars) {
      truncated = true
      return line.slice(0, maxLineChars)
    }
    return line
  })

  return { lines, truncated }
}
