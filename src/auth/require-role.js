import Boom from '@hapi/boom'

/**
 * Enforces that the authenticated user has a specific role.
 *
 * @param {string} requiredRole
 */
export function requireRole(requiredRole) {
  return (request, h) => {
    const roles = request.auth?.credentials?.user?.roles || []

    if (!roles.includes(requiredRole)) {
      throw Boom.forbidden()
    }

    return h.continue
  }
}
