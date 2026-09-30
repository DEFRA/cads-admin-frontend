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
    {
      text: 'S3 Monitoring',
      href: '/s3-monitoring',
      current: request?.path === '/s3-monitoring'
    },
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
