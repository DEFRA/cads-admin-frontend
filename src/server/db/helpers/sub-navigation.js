import { ctsImportPath, postgresPerformancePath } from '../paths.js'

const pages = [
  { text: 'Postgres Performance Monitoring', href: postgresPerformancePath },
  { text: 'CTS Parallel Import Monitoring', href: ctsImportPath }
]

/**
 * Sub-navigation between the pages of the DB Monitoring tab.
 *
 * @param {{ path?: string }} request
 */
export function buildDbMonitoringSubNavigation(request) {
  const path = request?.path ?? ''

  return pages.map((page) => ({
    ...page,
    current: path === page.href || path.startsWith(`${page.href}/`)
  }))
}
