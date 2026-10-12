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
      text: 'Monitoring',
      href: '/dashboard/monitoring',
      current: isCurrent(request, '/dashboard/monitoring')
    },
    {
      text: 'Sign out',
      href: '/logout',
      current: false
    }
  ]
}
