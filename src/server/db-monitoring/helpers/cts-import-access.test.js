import {
  canViewCtsImport,
  requireCtsImportAccess
} from './cts-import-access.js'
import { credentials } from '../../../../tests/helpers/credentials.js'

const superuser = 'cads-admin-superuser'
const dbExecute = 'admin.db.execute'

function requestWith(creds) {
  return { auth: { credentials: creds } }
}

describe('#canViewCtsImport', () => {
  test('Should allow a superuser with the admin.db.execute scope', () => {
    expect(
      canViewCtsImport(
        requestWith(credentials({ roles: [superuser], scopes: [dbExecute] }))
      )
    ).toBe(true)
  })

  test('Should deny without the cads-admin-superuser role', () => {
    expect(
      canViewCtsImport(
        requestWith(credentials({ roles: ['other'], scopes: [dbExecute] }))
      )
    ).toBe(false)
  })

  test('Should deny without the admin.db.execute scope', () => {
    expect(
      canViewCtsImport(
        requestWith(
          credentials({ roles: [superuser], scopes: ['admin.s3.manager'] })
        )
      )
    ).toBe(false)
  })

  test('Should deny an unauthenticated user', () => {
    expect(canViewCtsImport(requestWith(null))).toBe(false)
  })
})

describe('#requireCtsImportAccess', () => {
  const takeover = vi.fn(() => 'redirected')
  const h = {
    continue: 'continue',
    redirect: vi.fn(() => ({ takeover }))
  }

  test('Should continue when the user has the role and scope', () => {
    const request = requestWith(
      credentials({ roles: [superuser], scopes: [dbExecute] })
    )

    expect(requireCtsImportAccess(request, h)).toBe('continue')
    expect(h.redirect).not.toHaveBeenCalled()
  })

  test('Should redirect to the Unauthorised page otherwise', () => {
    const request = requestWith(credentials({ roles: [superuser] }))

    expect(requireCtsImportAccess(request, h)).toBe('redirected')
    expect(h.redirect).toHaveBeenCalledWith('/unauthorised')
  })
})
