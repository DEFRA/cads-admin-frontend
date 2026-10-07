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
        text: 'DB Monitoring',
        href: '/db-monitoring'
      },
      {
        current: false,
        text: 'S3 Monitoring',
        href: '/s3-monitoring'
      },
      {
        current: false,
        text: 'SQS Monitoring',
        href: '/sqs-monitoring'
      },
      {
        current: false,
        text: 'Sign out',
        href: '/logout'
      }
    ])
  })

  test('Should hide S3 Monitoring without the admin.s3.manager scope', () => {
    const navigation = buildNavigation(
      mockRequest({
        path: '/dashboard',
        auth: { credentials: credentials('admin.db.execute') }
      })
    )

    expect(navigation.map((item) => item.text)).not.toContain('S3 Monitoring')
  })

  test('Should highlight S3 Monitoring on its sub pages', () => {
    const navigation = buildNavigation(
      mockRequest({
        path: '/s3-monitoring/buckets/CadsInternalClient',
        auth: { credentials: credentials('admin.s3.manager') }
      })
    )

    expect(navigation.find((item) => item.text === 'S3 Monitoring')).toEqual(
      expect.objectContaining({ current: true })
    )
  })

  test('Should highlight DB Monitoring on its sub pages', () => {
    const navigation = buildNavigation(
      mockRequest({
        path: '/db-monitoring/cts-import',
        auth: { credentials: credentials('admin.db.execute') }
      })
    )

    expect(navigation.find((item) => item.text === 'DB Monitoring')).toEqual(
      expect.objectContaining({ current: true })
    )
  })
})
