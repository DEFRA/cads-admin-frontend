import {
  buildHeadlineFigures,
  buildMetric,
  findPostgresMetric,
  hiddenColumnKeys,
  postgresMetrics,
  postgresSections
} from './postgres-metrics.js'
import {
  postgresResults,
  sensitiveValues
} from '../../../../tests/fixtures/db-admin/postgres-results.js'

const metric = (command) => findPostgresMetric(command)

describe('#postgresMetrics', () => {
  test('Should chart every recommended monitoring command, and no action', () => {
    expect(postgresMetrics.map((item) => item.command)).toEqual([
      'sessions_by_state',
      'active_queries',
      'transactions',
      'rows_activity',
      'buffer_cache_hit_ratio',
      'idle_in_transaction',
      'locks_and_blocking',
      'prepared_transactions',
      'table_activity',
      'index_usage',
      'largest_tables',
      'database_size',
      'slow_queries',
      'shared_block_reads'
    ])
    for (const action of [
      'cancel_query',
      'terminate_query',
      'reset_pg_stat_statements'
    ]) {
      expect(findPostgresMetric(action)).toBeUndefined()
    }
  })

  test.each(postgresMetrics.map((item) => [item.command, item]))(
    '%s should not show SQL text or client addresses',
    (_, item) => {
      const keys = item.columns
        .map((column) => column.key)
        .filter((key) => typeof key === 'string')

      expect(keys.filter((key) => hiddenColumnKeys.includes(key))).toEqual([])

      const built = buildMetric(item, postgresResults[item.command], {
        full: true
      })
      const shown = JSON.stringify(built)
      for (const value of sensitiveValues) {
        expect(shown).not.toContain(value)
      }
    }
  )

  test.each(postgresMetrics.map((item) => [item.command, item]))(
    '%s should belong to a dashboard section',
    (_, item) => {
      expect(postgresSections.map((section) => section.id)).toContain(
        item.section
      )
    }
  )

  test('Should only offer the PID actions for commands that list processes', () => {
    expect(
      postgresMetrics.filter((item) => item.pidKey).map((item) => item.command)
    ).toEqual(['active_queries', 'idle_in_transaction', 'locks_and_blocking'])
  })
})

describe('#buildMetric', () => {
  test('Should build a bar chart and table for sessions by state', () => {
    expect(
      buildMetric(
        metric('sessions_by_state'),
        postgresResults.sessions_by_state
      )
    ).toEqual({
      totalRows: 3,
      shownRows: 3,
      chart: {
        type: 'bar',
        label: 'Bar chart showing the number of sessions in each state',
        maxValue: null,
        categories: ['active', 'idle', 'idle in transaction'],
        series: [{ name: 'Sessions', values: [12, 48, 3] }]
      },
      table: {
        head: [{ text: 'State' }, { text: 'Sessions', format: 'numeric' }],
        rows: [
          [{ text: 'active' }, { text: '12', format: 'numeric' }],
          [{ text: 'idle' }, { text: '48', format: 'numeric' }],
          [{ text: 'idle in transaction' }, { text: '3', format: 'numeric' }]
        ]
      }
    })
  })

  test('Should rank the longest running queries by duration in seconds', () => {
    const built = buildMetric(
      metric('active_queries'),
      postgresResults.active_queries
    )

    expect(built.chart.categories).toEqual([
      'PID 45231 / Import Service',
      'PID 45288 / Portal'
    ])
    expect(built.chart.series[0].values).toEqual([1824.5, 318])
    expect(built.table.rows[0].map((cell) => cell.text)).toEqual([
      '45231',
      'cads_api',
      'cads',
      'Import Service',
      'active',
      'DataFileRead',
      '30m 24s'
    ])
  })

  test('Should group commits and rollbacks per database', () => {
    const { chart } = buildMetric(
      metric('transactions'),
      postgresResults.transactions
    )

    expect(chart.type).toBe('grouped-bar')
    expect(chart.categories).toEqual(['cads', 'cts'])
    expect(chart.series).toEqual([
      { name: 'Commits', values: [12568234, 8421178] },
      { name: 'Rollbacks', values: [1834, 812] }
    ])
  })

  test('Should fix the cache hit ratio axis at 100 percent', () => {
    expect(
      buildMetric(
        metric('buffer_cache_hit_ratio'),
        postgresResults.buffer_cache_hit_ratio
      ).chart.maxValue
    ).toBe(100)
  })

  test('Should rank the largest tables by parsed size in megabytes', () => {
    const built = buildMetric(
      metric('largest_tables'),
      postgresResults.largest_tables
    )

    expect(built.chart.categories).toEqual([
      'cts.ct_registered_movements',
      'cts.ct_animal_statuses'
    ])
    expect(built.chart.series[0].values).toEqual([107520, 18432])
    expect(built.table.rows[0][1].text).toBe('105 GB')
  })

  test('Should chart database size in megabytes', () => {
    const { chart } = buildMetric(
      metric('database_size'),
      postgresResults.database_size
    )

    expect(chart.categories).toEqual(['cads', 'cts'])
    expect(chart.series[0].values).toEqual([497664, 217088])
  })

  test('Should label queries by query ID only', () => {
    const { chart } = buildMetric(
      metric('slow_queries'),
      postgresResults.slow_queries
    )

    expect(chart.categories).toEqual(['Query 8342112'])
  })

  test('Should have no chart for a summary metric', () => {
    const built = buildMetric(
      metric('locks_and_blocking'),
      postgresResults.locks_and_blocking
    )

    expect(built.chart).toBeNull()
    expect(built.table.rows).toEqual([
      [
        { text: '43211', format: 'numeric' },
        { text: '41872', format: 'numeric' },
        { text: '4m 3s' }
      ]
    ])
  })

  test('Should treat an empty object result as no rows', () => {
    expect(
      buildMetric(
        metric('prepared_transactions'),
        postgresResults.prepared_transactions
      )
    ).toEqual(
      expect.objectContaining({
        totalRows: 0,
        shownRows: 0,
        chart: null,
        table: expect.objectContaining({ rows: [] })
      })
    )
  })

  test('Should limit the summary rows but show them all in full', () => {
    const rows = Array.from({ length: 12 }, (_, index) => ({
      pid: index + 1,
      usename: 'app',
      duration: `00:00:${String(index).padStart(2, '0')}`
    }))

    const summary = buildMetric(metric('active_queries'), rows)
    const full = buildMetric(metric('active_queries'), rows, { full: true })

    expect(summary).toEqual(
      expect.objectContaining({ totalRows: 12, shownRows: 10 })
    )
    expect(summary.chart.categories[0]).toBe('PID 12 / app')
    expect(full).toEqual(
      expect.objectContaining({ totalRows: 12, shownRows: 12 })
    )
  })
})

describe('#buildHeadlineFigures', () => {
  test('Should count the active, blocked and idle sessions and find the best cache hit ratio', () => {
    expect(
      buildHeadlineFigures(postgresResults).map((figure) => [
        figure.label,
        figure.text
      ])
    ).toEqual([
      ['Active queries', '2'],
      ['Blocked sessions', '1'],
      ['Idle in transaction', '1'],
      ['Best cache hit ratio', '99.25%']
    ])
  })

  test('Should show zero when a command has no rows', () => {
    const figures = buildHeadlineFigures({
      ...postgresResults,
      locks_and_blocking: {}
    })

    expect(figures[1].text).toBe('0')
  })

  test('Should say a figure is not available when its command failed', () => {
    const figures = buildHeadlineFigures({})

    expect(figures.map((figure) => figure.text)).toEqual([
      'Not available',
      'Not available',
      'Not available',
      'Not available'
    ])
  })
})
