import { extractScopes, hasScope } from './extract-scopes.js'

function token(claims) {
  const encode = (value) =>
    Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${encode({ alg: 'none' })}.${encode(claims)}.signature`
}

describe('#extractScopes', () => {
  test('Should read Azure AD space-separated scp claim', () => {
    expect(
      extractScopes(token({ scp: 'admin.s3.manager admin.db.execute' }))
    ).toEqual(['admin.s3.manager', 'admin.db.execute'])
  })

  test('Should read OIDC mock scope array claim', () => {
    expect(
      extractScopes(token({ scope: ['openid', 'admin.s3.manager'] }))
    ).toEqual(['openid', 'admin.s3.manager'])
  })

  test('Should return no scopes when the claim is missing', () => {
    expect(extractScopes(token({ sub: 'abc' }))).toEqual([])
  })

  test('Should return no scopes for a missing or malformed token', () => {
    expect(extractScopes(undefined)).toEqual([])
    expect(extractScopes('not-a-jwt')).toEqual([])
    expect(extractScopes('a.!!!.c')).toEqual([])
  })
})

describe('#hasScope', () => {
  const request = (accessToken) => ({
    auth: { credentials: { tokenSet: { access_token: accessToken } } }
  })

  test('Should be true when the access token carries the scope', () => {
    expect(
      hasScope(request(token({ scp: 'admin.s3.manager' })), 'admin.s3.manager')
    ).toBe(true)
  })

  test('Should be false when the access token lacks the scope', () => {
    expect(
      hasScope(request(token({ scp: 'admin.db.execute' })), 'admin.s3.manager')
    ).toBe(false)
  })

  test('Should be false when there are no credentials', () => {
    expect(hasScope({ auth: {} }, 'admin.s3.manager')).toBe(false)
  })
})
