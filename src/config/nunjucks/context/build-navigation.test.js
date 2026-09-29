import { buildNavigation } from './build-navigation.js'

function mockRequest(options) {
  return { ...options }
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
          auth: { credentials: { userId: 123 } }
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
        text: 'Sign out',
        href: '/logout'
      }
    ])
  })
})
