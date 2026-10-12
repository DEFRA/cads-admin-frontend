import { format } from 'd3'

const compact = format('~s')
const full = format(',~r')

/**
 * Short axis tick labels, e.g. 12k, 1.5M and 2B rather than 2G.
 *
 * @param {number} value
 */
export function formatTick(value) {
  if (Math.abs(value) < 1000) {
    return full(value)
  }
  return compact(value).replace('G', 'B')
}

/**
 * @param {number} value
 */
export function formatValue(value) {
  return Number(value).toLocaleString('en-GB', { maximumFractionDigits: 2 })
}

/**
 * @param {string} text
 * @param {number} maxLength
 */
export function truncate(text, maxLength) {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text
}
