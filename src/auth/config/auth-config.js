import { getConfig } from '../../config/config.js'
import { resourceScopes } from '../constants/resource-scopes.js'

function buildCadsCdsScopes(cadsCdsClientId, useSimpleScopes) {
  const scopes = [
    resourceScopes.cadsCds.dbAdminExecute,
    resourceScopes.cadsCds.adminS3Manager,
    resourceScopes.cadsCds.adminQueueManager
  ]
  return useSimpleScopes
    ? scopes
    : scopes.map((scope) => `api://${cadsCdsClientId}/${scope}`)
}

function buildCadsBridgeScopes(cadsBridgeClientId, useSimpleScopes) {
  const scopes = [
    resourceScopes.cadsBridge.adminS3Manager,
    resourceScopes.cadsBridge.adminQueueManager
  ]
  return useSimpleScopes
    ? scopes
    : scopes.map((scope) => `api://${cadsBridgeClientId}/${scope}`)
}

export function getAuthConfig() {
  const config = getConfig()
  const useSimpleScopes = config.get('azure.useSimpleScopes')
  const cadsCdsClientId = config.get('azure.cadsCdsClientId')
  const cadsCdsScopes = buildCadsCdsScopes(cadsCdsClientId, useSimpleScopes)
  const cadsBridgeClientId = config.get('azure.cadsBridgeClientId')
  const cadsBridgeScopes = buildCadsBridgeScopes(
    cadsBridgeClientId,
    useSimpleScopes
  )

  const oidcScopes = ['openid', 'profile', 'email', 'offline_access']

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
    // Authorize request: all resources, so the user consents to everything once
    scope: [...oidcScopes, ...cadsCdsScopes, ...cadsBridgeScopes].join(' '),
    // Token request: Entra only accepts scopes for a single resource (AADSTS28000)
    exchangeScope: [...oidcScopes, ...cadsCdsScopes].join(' '),
    // Bridge token: requested separately via the refresh token
    bridgeExchangeScope: ['offline_access', ...cadsBridgeScopes].join(' ')
  }
}
