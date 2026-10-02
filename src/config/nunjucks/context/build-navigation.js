import { hasScope } from '../../../auth/helpers/extract-scopes.js'
import { resourceScopes } from '../../../auth/constants/resource-scopes.js'

function isCurrent(request, path) {
  return request?.path === path || request?.path?.startsWith(`${path}/`)
}

export function buildNavigation(request) {
  const isAuthenticated = Boolean(request?.auth?.credentials)

  if (!isAuthenticated) {
    return []
  }

  return [
    {
      text: 'Dashboard',
      href: '/dashboard',
      current: request?.path === '/dashboard'
    },
    {
      text: 'DB Monitoring',
      href: '/db-monitoring',
      current: request?.path === '/db-monitoring'
    },
    ...(hasScope(request, resourceScopes.cadsCds.adminS3Manager)
      ? [
          {
            text: 'S3 Monitoring',
            href: '/s3-monitoring',
            current: isCurrent(request, '/s3-monitoring')
          }
        ]
      : []),
    {
      text: 'SQS Monitoring',
      href: '/sqs-monitoring',
      current: request?.path === '/sqs-monitoring'
    },
    {
      text: 'Sign out',
      href: '/logout',
      current: false
    }
  ]
}
