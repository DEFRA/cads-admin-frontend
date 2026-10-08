import { hasRole } from '../../../auth/helpers/extract-roles.js'
import { hasScope } from '../../../auth/helpers/extract-scopes.js'
import { roleTypes } from '../../../auth/constants/roles.js'
import { resourceScopes } from '../../../auth/constants/resource-scopes.js'
import { unauthorisedPath } from '../../unauthorised/index.js'

export function canViewCtsImport(request) {
  return (
    hasRole(request, roleTypes.cadsAdminSuperuser) &&
    hasScope(request, resourceScopes.cadsCds.dbAdminExecute)
  )
}

export function requireCtsImportAccess(request, h) {
  if (canViewCtsImport(request)) {
    return h.continue
  }

  return h.redirect(unauthorisedPath).takeover()
}
