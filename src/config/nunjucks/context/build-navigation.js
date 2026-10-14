import { hasAnyScope } from '../../../auth/helpers/extract-scopes.js'
import { resourceScopes } from '../../../auth/constants/resource-scopes.js'

function isCurrent(request, path) {
  return request?.path === path || request?.path?.startsWith(`${path}/`)
}

export function buildNavigation(request) {
  const isAuthenticated = Boolean(request?.auth?.credentials)

  if (!isAuthenticated) {
    return []
  }

  const hasMonitoringScope = hasAnyScope(request, [
    resourceScopes.cadsCds.adminQueueManager,
    resourceScopes.cadsCds.adminS3Manager,
    resourceScopes.cadsCds.dbAdminExecute,
    resourceScopes.cadsBridge.adminQueueManager,
    resourceScopes.cadsBridge.adminS3Manager
  ])

  return [
    {
      text: 'Dashboard',
      href: '/dashboard',
      current: request?.path === '/dashboard'
    },
    ...(hasMonitoringScope
      ? [
          {
            text: 'Monitoring',
            href: '/dashboard/monitoring',
            current: isCurrent(request, '/dashboard/monitoring')
          }
        ]
      : []),
    {
      text: 'Sign out',
      href: '/logout',
      current: false
    }
  ]
}
