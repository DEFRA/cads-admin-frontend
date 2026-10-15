export function credentials({ roles = [], scopes = [] } = {}) {
  const encode = (value) =>
    Buffer.from(JSON.stringify(value)).toString('base64url')
  const accessToken = `${encode({ alg: 'none' })}.${encode({ scp: scopes.join(' ') })}.signature`

  return { user: { roles }, tokenSet: { access_token: accessToken } }
}

// Has the scope needed for every DB Monitoring page
export const dbMonitoringUser = credentials({ scopes: ['admin.db.execute'] })

export const ctsImportUser = dbMonitoringUser
