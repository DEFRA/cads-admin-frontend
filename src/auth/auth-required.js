/**
 * Middleware to enforce authentication.
 * Redirects unauthenticated users to /login.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 */
export function authRequired(request, h) {
  const isAuthenticated = Boolean(request.auth?.credentials)

  if (!isAuthenticated) {
    request.app.redirectTo = request.path
    return h.redirect('/login').takeover()
  }

  return h.continue
}
