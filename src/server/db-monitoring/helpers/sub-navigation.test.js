import { buildDbMonitoringSubNavigation } from './sub-navigation.js'

describe('#buildDbMonitoringSubNavigation', () => {
  test('Should list the DB Monitoring pages, Postgres first', () => {
    expect(
      buildDbMonitoringSubNavigation({
        path: '/db-monitoring/postgres-performance'
      })
    ).toEqual([
      {
        text: 'Postgres Performance Monitoring',
        href: '/db-monitoring/postgres-performance',
        current: true
      },
      {
        text: 'CTS Parallel Import Monitoring',
        href: '/db-monitoring/cts-import',
        current: false
      }
    ])
  })

  test.each([
    ['/db-monitoring/postgres-performance/active_queries', 0],
    ['/db-monitoring/cts-import', 1]
  ])('Should mark the current page for %s', (path, currentIndex) => {
    const items = buildDbMonitoringSubNavigation({ path })

    expect(items.map((item) => item.current)).toEqual(
      items.map((_, index) => index === currentIndex)
    )
  })

  test('Should not match a path that only shares a prefix', () => {
    const items = buildDbMonitoringSubNavigation({
      path: '/db-monitoring/postgres-performance-old'
    })

    expect(items.some((item) => item.current)).toBe(false)
  })
})
