import { TokenSet } from 'openid-client'
import { getOidcClient } from './oidc-client.js'
import { getAuthConfig } from './config/auth-config.js'
import { getSession, setSession } from './session-store.js'

/**
 * Entra only issues an access token for ONE resource per token request.
 * Sign-in gives us the CDS token (stored as session.tokenSet.access_token).
 * Tokens for other resources are fetched on demand with the refresh token
 * and cached in session.resourceTokens.
 *
 * @param {string} sessionId
 * @param {'cds' | 'bridge'} [resource]
 * @returns {Promise<string | null>}
 */
export async function getAccessToken(sessionId, resource = 'cds') {
  const session = await getSession(sessionId)
  if (!session?.tokenSet) {
    return null
  }

  if (resource === 'cds') {
    return session.tokenSet.access_token ?? null
  }

  if (resource === 'bridge') {
    return getBridgeToken(sessionId, session)
  }

  throw new Error(`Unknown API resource: ${resource}`)
}

async function getBridgeToken(sessionId, session) {
  const cached = session.resourceTokens?.bridge
  if (cached && !new TokenSet(cached).expired()) {
    return cached.access_token
  }

  const oidcClient = await getOidcClient()
  const refreshed = await oidcClient.refresh(session.tokenSet.refresh_token, {
    exchangeBody: { scope: getAuthConfig().bridgeExchangeScope }
  })

  await setSession(sessionId, {
    ...session,
    // Entra rotates refresh tokens, so keep the newest one
    tokenSet: {
      ...session.tokenSet,
      refresh_token: refreshed.refresh_token ?? session.tokenSet.refresh_token
    },
    resourceTokens: {
      ...session.resourceTokens,
      bridge: {
        access_token: refreshed.access_token,
        expires_at: refreshed.expires_at
      }
    }
  })

  return refreshed.access_token
}
