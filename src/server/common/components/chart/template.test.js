import { renderComponent } from '../../../../../tests/helpers/component-helpers.js'

const chartCard = {
  id: 'metric-sessions-by-state',
  command: 'sessions_by_state',
  title: 'Sessions by state',
  description: 'Number of database sessions in each connection state.',
  detailHref: '/dashboard/monitoring/db/postgres-performance/sessions_by_state',
  chart: {
    type: 'bar',
    label: 'Bar chart showing sessions by state',
    maxValue: null,
    categories: ['active', '<script>'],
    series: [{ name: 'Sessions', values: [3, 1] }]
  },
  table: {
    head: [{ text: 'State' }, { text: 'Sessions', format: 'numeric' }],
    rows: [
      [{ text: 'active' }, { text: '3', format: 'numeric' }],
      [{ text: '<script>' }, { text: '1', format: 'numeric' }]
    ]
  },
  totalRows: 2,
  shownRows: 2
}

describe('Chart Component', () => {
  test('Should render the title, description and details link', () => {
    const $card = renderComponent('chart', chartCard)

    expect($card('#metric-sessions-by-state-title').text()).toBe(
      'Sessions by state'
    )
    expect($card('#metric-sessions-by-state-description').text()).toBe(
      'Number of database sessions in each connection state.'
    )
    const link = $card('[data-testid="metric-detail-link"]')
    expect(link.attr('href')).toBe(
      '/dashboard/monitoring/db/postgres-performance/sessions_by_state'
    )
    expect(link.text()).toBe('View details for sessions by state')
  })

  test('Should hand the chart data to the browser as an escaped attribute', () => {
    const $card = renderComponent('chart', chartCard)

    const figure = $card('[data-testid="metric-chart"]')
    expect(figure.attr('data-module')).toBe('app-chart')
    expect(figure.attr('aria-labelledby')).toBe(
      'metric-sessions-by-state-title'
    )
    expect(figure.attr('aria-describedby')).toBe(
      'metric-sessions-by-state-description'
    )
    expect(JSON.parse(figure.attr('data-chart'))).toEqual(chartCard.chart)
    // Database values are escaped, so they never become markup
    expect($card('script')).toHaveLength(0)
  })

  test('Should put the chart data in a table inside a details component', () => {
    const $card = renderComponent('chart', chartCard)

    expect($card('.govuk-details__summary-text').text().trim()).toBe(
      'Show data table'
    )
    const table = $card('.govuk-details [data-testid="metric-table"]')
    expect(table.find('caption').text().trim()).toBe('Sessions by state')
    expect(
      table
        .find('tbody tr')
        .first()
        .find('td')
        .map((_, td) => $card(td).text().trim())
        .get()
    ).toEqual(['active', '3'])
  })

  test('Should say how many rows are shown when the summary is limited', () => {
    const $card = renderComponent('chart', {
      ...chartCard,
      totalRows: 25,
      shownRows: 2
    })

    expect($card('[data-testid="metric-rows-shown"]').text()).toBe(
      'Showing 2 of 25 rows.'
    )
  })

  test('Should show a key figure and an open table for a summary metric', () => {
    const $card = renderComponent('chart', {
      ...chartCard,
      chart: null,
      summaryLabel: 'Blocked sessions',
      summaryValue: 2
    })

    expect($card('[data-testid="metric-summary-value"]').text()).toBe('2')
    expect($card('[data-testid="metric-chart"]')).toHaveLength(0)
    expect($card('.govuk-details')).toHaveLength(0)
    expect($card('[data-testid="metric-table"]')).toHaveLength(1)
  })

  test('Should say when there is no data', () => {
    const $card = renderComponent('chart', {
      ...chartCard,
      chart: null,
      table: { head: chartCard.table.head, rows: [] }
    })

    expect($card('[data-testid="metric-empty"]').text()).toBe(
      'There is no data to show.'
    )
    expect($card('[data-testid="metric-table"]')).toHaveLength(0)
  })

  test('Should show an error message instead of the chart and table', () => {
    const $card = renderComponent('chart', {
      ...chartCard,
      error: 'There was a problem contacting the service.'
    })

    expect($card('[data-testid="metric-error"]').text()).toContain(
      'There was a problem contacting the service.'
    )
    expect($card('[data-testid="metric-chart"]')).toHaveLength(0)
    expect($card('[data-testid="metric-table"]')).toHaveLength(0)
  })
})
