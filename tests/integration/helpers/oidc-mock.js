import { GenericContainer, Wait } from 'testcontainers'
import { load } from 'cheerio'

// Same image and resources as cads-tools/oidc/docker-compose.oidc.yml, with
// the users and client inlined so the tests do not depend on that repo
const oidcMockImage = 'ghcr.io/soluto/oidc-server-mock:0.8.6'

export const appOrigin = 'http://localhost:3010'
export const oidcClient = {
  id: 'local-cads-admin-frontend',
  secret: 'local-mock-secret'
}

const apiScopes = [
  'admin.db.execute',
  'admin.s3.manager',
  'admin.queue.manager'
]

export const oidcUsers = {
  admin: { username: 'cads-admin-user', password: 'password' }
}

const users = [
  {
    SubjectId: 'bb054d87-3cf7-4809-beaf-42b0cdc2e419',
    Username: oidcUsers.admin.username,
    Password: oidcUsers.admin.password,
    Claims: [{ Type: 'name', Value: 'Test CADS Admin' }]
  }
]

const clients = [
  {
    ClientId: oidcClient.id,
    ClientSecrets: [oidcClient.secret],
    AllowedGrantTypes: ['authorization_code'],
    RequirePkce: false,
    RequireConsent: false,
    RedirectUris: [`${appOrigin}/auth/callback`],
    AllowedScopes: [
      'openid',
      'profile',
      'email',
      'offline_access',
      ...apiScopes
    ],
    AllowOfflineAccess: true,
    AccessTokenType: 'Jwt',
    AlwaysSendClientClaims: true,
    AlwaysIncludeUserClaimsInIdToken: true,
    ClientClaimsPrefix: ''
  }
]

/**
 * Starts the OIDC mock. The issuer is taken from the request host, so the
 * discovery document and tokens match the mapped port.
 *
 * @returns {Promise<{ url: string, stop: () => Promise<void> }>}
 */
export async function startOidcMock() {
  const container = await new GenericContainer(oidcMockImage)
    .withExposedPorts(80)
    .withEnvironment({
      ASPNETCORE_ENVIRONMENT: 'Development',
      USERS_CONFIGURATION_INLINE: JSON.stringify(users),
      CLIENTS_CONFIGURATION_INLINE: JSON.stringify(clients),
      API_SCOPES_INLINE: JSON.stringify(apiScopes.map((Name) => ({ Name }))),
      API_RESOURCES_INLINE: JSON.stringify([
        {
          Name: 'api://local-cads-cds',
          Scopes: apiScopes
        }
      ]),
      OVERRIDE_STANDARD_IDENTITY_RESOURCES: 'true',
      IDENTITY_RESOURCES_INLINE: JSON.stringify([
        { Name: 'openid', ClaimTypes: ['sub'] },
        { Name: 'profile', ClaimTypes: ['name'] },
        { Name: 'email', ClaimTypes: ['email'] }
      ])
    })
    .withWaitStrategy(Wait.forHttp('/.well-known/openid-configuration', 80))
    .start()

  return {
    url: `http://${container.getHost()}:${container.getMappedPort(80)}`,
    stop: () => container.stop()
  }
}

/**
 * Starts Redis for the auth session store.
 *
 * @param {string} password
 */
export async function startRedis(password) {
  const container = await new GenericContainer('redis:7.2.3-alpine3.18')
    .withExposedPorts(6379)
    .withCommand(['redis-server', '--requirepass', password])
    .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
    .start()

  return {
    host: container.getHost(),
    port: container.getMappedPort(6379),
    stop: () => container.stop()
  }
}

/** A minimal cookie jar for requests to the OIDC mock. */
function cookieJar() {
  const cookies = new Map()
  return {
    store(response) {
      for (const header of response.headers.getSetCookie()) {
        const [pair] = header.split(';')
        const index = pair.indexOf('=')
        cookies.set(pair.slice(0, index), pair.slice(index + 1))
      }
    },
    header() {
      return [...cookies].map(([name, value]) => `${name}=${value}`).join('; ')
    }
  }
}

function sidCookieFrom(response) {
  const headers = [response.headers['set-cookie'] ?? []].flat()
  const sid = headers.find((header) => header.startsWith('sid='))
  if (!sid) {
    throw new Error(`No session cookie in response ${response.statusCode}`)
  }
  return sid.split(';')[0]
}

/**
 * Signs in through the real login flow: the app's /login redirect, the OIDC
 * mock's login form and the app's /auth/callback code exchange.
 *
 * @param {import('@hapi/hapi').Server} server
 * @param {{ username: string, password: string }} user
 * @param {{ removeScopes?: string[] }} [options] scopes the user does not
 *   consent to, to sign in without them
 * @returns {Promise<string>} the session cookie for later requests
 */
export async function signIn(server, user, { removeScopes = [] } = {}) {
  const host = new URL(appOrigin).host

  const login = await server.inject({ url: '/login', headers: { host } })
  const handshakeCookie = sidCookieFrom(login)

  const authorizeUrl = new URL(login.headers.location)
  const scopes = authorizeUrl.searchParams
    .get('scope')
    .split(' ')
    .filter((scope) => !removeScopes.includes(scope))
  authorizeUrl.searchParams.set('scope', scopes.join(' '))

  const jar = cookieJar()
  const mockFetch = async (url, init = {}) => {
    const response = await fetch(url, {
      ...init,
      redirect: 'manual',
      headers: { ...init.headers, cookie: jar.header() }
    })
    jar.store(response)
    return response
  }

  const authorize = await mockFetch(authorizeUrl)
  const loginPageUrl = new URL(authorize.headers.get('location'), authorizeUrl)
  const loginPage = await mockFetch(loginPageUrl)
  const $ = load(await loginPage.text())

  const form = new URLSearchParams({
    'Input.ReturnUrl': $('input[name="Input.ReturnUrl"]').val(),
    'Input.Username': user.username,
    'Input.Password': user.password,
    'Input.RememberLogin': 'false',
    'Input.Button': 'login',
    __RequestVerificationToken: $(
      'input[name="__RequestVerificationToken"]'
    ).val()
  })
  const loggedIn = await mockFetch(new URL('/Account/Login', loginPageUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form.toString()
  })

  // Follow the mock's redirects until it sends the browser back to the app
  let location = new URL(loggedIn.headers.get('location'), loginPageUrl)
  for (let hop = 0; location.origin !== appOrigin; hop++) {
    if (hop > 5) {
      throw new Error(`Sign in did not return to the app: ${location}`)
    }
    const response = await mockFetch(location)
    location = new URL(response.headers.get('location'), location)
  }

  const callback = await server.inject({
    url: `${location.pathname}${location.search}`,
    headers: { host, cookie: handshakeCookie }
  })
  if (callback.statusCode !== 302) {
    throw new Error(`Sign in callback failed with ${callback.statusCode}`)
  }

  return sidCookieFrom(callback)
}
