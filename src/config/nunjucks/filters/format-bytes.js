const units = ['bytes', 'KB', 'MB', 'GB', 'TB']

export function formatBytes(value) {
  const bytes = value === null || value === '' ? Number.NaN : Number(value)

  if (!Number.isFinite(bytes) || bytes < 0) {
    return ''
  }

  if (bytes === 1) {
    return '1 byte'
  }

  let size = bytes
  let unit = 0
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024
    unit++
  }

  const rounded = unit === 0 ? size : Number(size.toFixed(1))
  return `${rounded.toLocaleString('en-GB')} ${units[unit]}`
}
