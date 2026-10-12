// Converts the raw values returned by the db admin commands into numbers the
// charts can plot and text the tables can show.

const secondsPerUnit = { day: 86400, hour: 3600, min: 60, sec: 1 }

const sizeUnits = { bytes: 0, kb: 1, mb: 2, gb: 3, tb: 4, pb: 5 }

/**
 * The backend returns a list for each command, or an empty object when a
 * command has no rows.
 *
 * @param {unknown} result
 * @returns {Record<string, any>[]}
 */
export function toRows(result) {
  return Array.isArray(result) ? result : []
}

/**
 * Parses a Postgres interval, e.g. "00:30:24.5", "1 day 02:03:04" or
 * "3 days", into seconds.
 *
 * @param {string | null | undefined} value
 * @returns {number | null}
 */
export function parseInterval(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return null
  }

  let seconds = 0
  let matched = false

  const unitPattern = /(-?\d+(?:\.\d+)?)\s*(day|hour|min|sec)[a-z]*/gi
  for (const [, amount, unit] of value.matchAll(unitPattern)) {
    seconds += Number(amount) * secondsPerUnit[unit.toLowerCase()]
    matched = true
  }

  const time = /(-)?(\d+):(\d{2}):(\d{2}(?:\.\d+)?)/.exec(value)
  if (time) {
    const [, sign, hours, minutes, secs] = time
    const total = Number(hours) * 3600 + Number(minutes) * 60 + Number(secs)
    seconds += sign ? -total : total
    matched = true
  }

  return matched ? seconds : null
}

/**
 * @param {number | null} seconds
 * @returns {string}
 */
export function formatDuration(seconds) {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) {
    return ''
  }
  if (seconds < 1) {
    return `${Math.round(seconds * 1000)}ms`
  }

  let remaining = Math.floor(seconds)
  const parts = []
  for (const [suffix, size] of [
    ['d', 86400],
    ['h', 3600],
    ['m', 60]
  ]) {
    if (remaining >= size) {
      parts.push(`${Math.floor(remaining / size)}${suffix}`)
      remaining %= size
    }
  }
  if (remaining || !parts.length) {
    parts.push(`${remaining}s`)
  }
  return parts.join(' ')
}

/**
 * Parses pg_size_pretty output, e.g. "8192 bytes" or "12 MB", into bytes.
 *
 * @param {string | null | undefined} value
 * @returns {number | null}
 */
export function parseSize(value) {
  const match = /^\s*(\d+(?:\.\d+)?)\s*(bytes|[kmgtp]b)\s*$/i.exec(value ?? '')
  if (!match) {
    return null
  }
  return Number(match[1]) * 1024 ** sizeUnits[match[2].toLowerCase()]
}

/**
 * @param {unknown} value
 * @returns {number}
 */
export function toNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}
