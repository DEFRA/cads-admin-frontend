export const s3MonitoringPath = '/s3-monitoring'

function withQuery(path, params = {}) {
  const query = new URLSearchParams()
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(name, String(value))
    }
  }
  const queryString = query.toString()
  return queryString ? `${path}?${queryString}` : path
}

export function bucketListUrl(params) {
  return withQuery(s3MonitoringPath, params)
}

export function explorerUrl(clientName, params) {
  return withQuery(
    `${s3MonitoringPath}/buckets/${encodeURIComponent(clientName)}`,
    params
  )
}

export function viewerUrl(clientName, key, params) {
  return withQuery(
    `${s3MonitoringPath}/buckets/${encodeURIComponent(clientName)}/object`,
    { key, ...params }
  )
}

/**
 * The complete folder part of a prefix: 'imports/2024-' -> 'imports/'
 */
export function folderOf(prefix = '') {
  return prefix.slice(0, prefix.lastIndexOf('/') + 1)
}

/**
 * A key or folder name relative to the folder being viewed
 */
export function relativeName(key, folder = '') {
  return key.startsWith(folder) ? key.slice(folder.length) : key
}

/**
 * Breadcrumbs for a location in a bucket. Every complete folder in the path
 * links back to the explorer; a trailing partial prefix or file name is shown
 * as the current page.
 *
 * @param {{ clientName: string, bucketName: string }} bucket
 * @param {string} [path] - a prefix ('imports/2024/') or object key
 */
export function buildBreadcrumbs(bucket, path = '') {
  const folder = folderOf(path)
  const trailing = path.slice(folder.length)

  const items = [
    { text: 'Dashboard', href: '/dashboard' },
    { text: 'S3 Monitoring', href: s3MonitoringPath },
    { text: bucket.bucketName, href: explorerUrl(bucket.clientName) }
  ]

  let walked = ''
  for (const segment of folder.split('/').filter(Boolean)) {
    walked += `${segment}/`
    items.push({
      text: segment,
      href: explorerUrl(bucket.clientName, { prefix: walked })
    })
  }

  if (trailing) {
    items.push({ text: trailing })
  } else {
    delete items.at(-1).href
  }

  return items
}
