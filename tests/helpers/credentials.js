export function credentials({ roles = [], scopes = [] } = {}) {
  const encode = (value) =>
    Buffer.from(JSON.stringify(value)).toString('base64url')
  const accessToken = `${encode({ alg: 'none' })}.${encode({ scp: scopes.join(' ') })}.signature`

  return { user: { roles }, tokenSet: { access_token: accessToken } }
}

export const ctsImportUser = credentials({
  roles: ['cads-admin-superuser'],
  scopes: ['admin.db.execute']
})
