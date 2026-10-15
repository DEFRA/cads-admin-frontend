import { hasScope } from '../../../auth/helpers/extract-scopes.js'
import { resourceScopes } from '../../../auth/constants/resource-scopes.js'
import { unauthorisedPath } from '../../unauthorised/index.js'

export function canViewDbMonitoring(request) {
  return hasScope(request, resourceScopes.cadsCds.dbAdminExecute)
}

export function requireDbMonitoringAccess(request, h) {
  if (canViewDbMonitoring(request)) {
    return h.continue
  }

  return h.redirect(unauthorisedPath).takeover()
}
