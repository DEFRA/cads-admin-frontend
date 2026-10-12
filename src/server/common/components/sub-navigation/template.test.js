import { renderComponent } from '../../../../../tests/helpers/component-helpers.js'

describe('Sub navigation Component', () => {
  let $nav

  beforeEach(() => {
    $nav = renderComponent('sub-navigation', {
      label: 'DB Monitoring',
      items: [
        { text: 'Postgres', href: '/db-monitoring/postgres', current: true },
        { text: 'CTS import', href: '/db-monitoring/cts-import' }
      ]
    })
  })

  test('Should render a labelled navigation landmark', () => {
    expect($nav('nav[aria-label="DB Monitoring"]')).toHaveLength(1)
  })

  test('Should render a link for each item', () => {
    expect(
      $nav('a')
        .map((_, link) => [[$nav(link).attr('href'), $nav(link).text()]])
        .get()
    ).toEqual([
      ['/db-monitoring/postgres', 'Postgres'],
      ['/db-monitoring/cts-import', 'CTS import']
    ])
  })

  test('Should mark only the current item', () => {
    expect($nav('a[aria-current="page"]').text()).toBe('Postgres')
    expect($nav('a[aria-current]')).toHaveLength(1)
  })
})
