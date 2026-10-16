import { renderComponent } from '../../../../../tests/helpers/component-helpers.js'

describe('Sub navigation Component', () => {
  let $nav

  beforeEach(() => {
    $nav = renderComponent('sub-navigation', {
      label: 'DB Monitoring',
      items: [
        {
          text: 'Postgres',
          href: '/dashboard/monitoring/db/postgres',
          current: true
        },
        { text: 'CTS import', href: '/dashboard/monitoring/db/cts-import' }
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
      ['/dashboard/monitoring/db/postgres', 'Postgres'],
      ['/dashboard/monitoring/db/cts-import', 'CTS import']
    ])
  })

  test('Should mark only the current item', () => {
    expect($nav('a[aria-current="page"]').text()).toBe('Postgres')
    expect($nav('a[aria-current]')).toHaveLength(1)
  })
})
