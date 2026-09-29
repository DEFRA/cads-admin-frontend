import { getConfig } from '../../config/config.js'
import { resourceScopes } from '../constants/resource-scopes.js'

function buildCadsCdsScopes(cadsCdsClientId, useSimpleScopes) {
  return useSimpleScopes
    ? [resourceScopes.cadsCds.reportsRead]
    : [`api://${cadsCdsClientId}/${resourceScopes.cadsCds.reportsRead}`]
}

export function getAuthConfig() {
  const config = getConfig()
  const cadsCdsClientId = config.get('azure.cadsCdsClientId')
  const useSimpleScopes = config.get('azure.useSimpleScopes')
  const cadsCdsScopes = buildCadsCdsScopes(cadsCdsClientId, useSimpleScopes)

  return {
    clientId: config.get('oidc.clientId'),
    clientSecret: config.get('oidc.clientSecret'),
    redirectPath: config.get('oidc.redirectPath'),
    postLogoutRedirectPath: config.get('oidc.postLogoutRedirectPath'),
    allowedRedirectOrigins: (config.get('oidc.allowedRedirectOrigins') || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    defaultRedirect: config.get('oidc.postLoginDefaultRedirectUri'),
    oidcWellKnownUrl: config.get('oidc.wellKnownUrl'),
    externalAuthorizeEndpoint: config.get('oidc.externalAuthorizeEndpoint'),
    externalEndSessionEndpoint: config.get('oidc.externalEndSessionEndpoint'),
    enableDebugEndpoints: config.get('oidc.enableDebugEndpoints'),
    scope: [
      'openid',
      'profile',
      'email',
      'offline_access',
      ...cadsCdsScopes
    ].join(' ')
  }
}
