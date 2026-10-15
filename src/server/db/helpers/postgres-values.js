// Converts the raw values returned by the db admin commands into numbers the
// charts can plot and text the tables can show.

const millisecondsPerSecond = 1000
const secondsPerMinute = 60
const secondsPerHour = 3600
const secondsPerDay = 86400

const secondsPerUnit = {
  day: secondsPerDay,
  hour: secondsPerHour,
  min: secondsPerMinute,
  sec: 1
}

// Matched against whole whitespace separated tokens, so each pattern is
// anchored at both ends and cannot backtrack across the input
const amountPattern = /^-?\d+(?:\.\d+)?$/
const unitPattern = /^(day|hour|min|sec)/i
const timePattern = /^([+-]?)(\d+):(\d{2}):(\d{2}(?:\.\d+)?)$/

const bytesPerKilobyte = 1024

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

  const tokens = value.trim().split(/\s+/)
  tokens.forEach((token, index) => {
    const time = timePattern.exec(token)
    if (time) {
      const [, sign, hours, minutes, secs] = time
      const total =
        Number(hours) * secondsPerHour +
        Number(minutes) * secondsPerMinute +
        Number(secs)
      seconds += sign === '-' ? -total : total
      matched = true
      return
    }

    // An amount followed by its unit, e.g. "3 days"
    const unit = unitPattern.exec(tokens[index + 1] ?? '')
    if (unit && amountPattern.test(token)) {
      seconds += Number(token) * secondsPerUnit[unit[1].toLowerCase()]
      matched = true
    }
  })

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
    return `${Math.round(seconds * millisecondsPerSecond)}ms`
  }

  let remaining = Math.floor(seconds)
  const parts = []
  for (const [suffix, size] of [
    ['d', secondsPerDay],
    ['h', secondsPerHour],
    ['m', secondsPerMinute]
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
  return (
    Number(match[1]) * bytesPerKilobyte ** sizeUnits[match[2].toLowerCase()]
  )
}

/**
 * @param {unknown} value
 * @returns {number}
 */
export function toNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}
