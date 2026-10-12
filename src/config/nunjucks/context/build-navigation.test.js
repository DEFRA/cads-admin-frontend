import { buildNavigation } from './build-navigation.js'

function mockRequest(options) {
  return { ...options }
}

function accessToken(claims) {
  const encode = (value) =>
    Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${encode({ alg: 'none' })}.${encode(claims)}.signature`
}

function credentials(scp) {
  return { tokenSet: { access_token: accessToken({ scp }) } }
}

describe('#buildNavigation', () => {
  test('Should provide expected navigation details for unauthenticated user', () => {
    expect(
      buildNavigation(
        mockRequest({ path: '/non-existent-path', auth: { credentials: null } })
      )
    ).toEqual([])
  })

  test('Should provide expected highlighted navigation details', () => {
    expect(
      buildNavigation(mockRequest({ path: '/', auth: { credentials: null } }))
    ).toEqual([])
  })

  test('Should show protected routes when authenticated', () => {
    expect(
      buildNavigation(
        mockRequest({
          path: '/dashboard',
          auth: { credentials: credentials('admin.s3.manager') }
        })
      )
    ).toEqual([
      {
        current: true,
        text: 'Dashboard',
        href: '/dashboard'
      },
      {
        current: false,
        text: 'Monitoring',
        href: '/dashboard/monitoring'
      },
      {
        current: false,
        text: 'Sign out',
        href: '/logout'
      }
    ])
  })
})
