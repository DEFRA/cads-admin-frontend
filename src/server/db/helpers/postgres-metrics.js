import { formatDateTime } from './cts-import-commands.js'
import {
  formatDuration,
  parseInterval,
  parseSize,
  toNumber,
  toRows
} from './postgres-values.js'

// Columns holding SQL text or client network addresses are never shown, so
// no column below may use one of these keys
export const hiddenColumnKeys = Object.freeze([
  'query',
  'blocked_query',
  'blocking_query',
  'client_addr'
])

export const postgresSections = [
  { id: 'sessions', title: 'Session monitoring' },
  { id: 'performance', title: 'Performance monitoring' },
  { id: 'cache', title: 'Cache and idle transaction monitoring' },
  { id: 'locks', title: 'Locks and prepared transactions' },
  { id: 'tables', title: 'Table and index activity' },
  { id: 'storage', title: 'Table and storage monitoring' },
  { id: 'queries', title: 'Query performance monitoring' }
]

const tableName = (row) => `${row.schemaname}.${row.table_name}`

const byDesc = (value) => (a, b) => value(b) - value(a)

const queryLabel = (row) => `Query ${row.queryid}`

const queryStatisticsUnavailable =
  'Query statistics could not be loaded. The pg_stat_statements extension may not be installed on this database.'

/**
 * Each metric maps a db admin command to a summary chart and its data table.
 *
 * - `order` sorts the rows, `limit` caps the rows on the summary dashboard
 *   (the detailed view shows them all)
 * - `category` and `series` turn each row into a chart bar or group of bars
 * - `pidKey` marks the column that holds a backend process ID, so the
 *   detailed view offers the cancel and terminate actions
 */
export const postgresMetrics = [
  {
    command: 'sessions_by_state',
    section: 'sessions',
    width: 'one-third',
    title: 'Sessions by state',
    description: 'Number of database sessions in each connection state.',
    chartType: 'bar',
    chartLabel: 'Bar chart showing the number of sessions in each state',
    category: (row) => row.state ?? 'unknown',
    series: [{ name: 'Sessions', value: (row) => toNumber(row.sessions) }],
    columns: [
      { key: 'state', text: 'State' },
      { key: 'sessions', text: 'Sessions', format: 'number' }
    ]
  },
  {
    command: 'active_queries',
    section: 'sessions',
    width: 'two-thirds',
    title: 'Longest running queries',
    description: 'Queries that are not idle, by how long they have run.',
    chartType: 'horizontal-bar',
    chartLabel:
      'Horizontal bar chart showing the longest running queries by duration in seconds',
    order: byDesc((row) => parseInterval(row.duration) ?? 0),
    limit: 10,
    pidKey: 'pid',
    category: (row) =>
      `PID ${row.pid} / ${row.application_name || row.usename || 'unknown'}`,
    series: [
      {
        name: 'Duration (seconds)',
        value: (row) => parseInterval(row.duration) ?? 0
      }
    ],
    columns: [
      { key: 'pid', text: 'PID', format: 'id' },
      { key: 'usename', text: 'User' },
      { key: 'datname', text: 'Database' },
      { key: 'application_name', text: 'Application' },
      { key: 'state', text: 'State' },
      { key: 'wait_event', text: 'Wait event' },
      { key: 'duration', text: 'Duration', format: 'duration' }
    ]
  },
  {
    command: 'transactions',
    section: 'performance',
    width: 'one-half',
    title: 'Transactions',
    description: 'Committed and rolled back transactions for each database.',
    chartType: 'grouped-bar',
    chartLabel:
      'Grouped bar chart showing commits and rollbacks for each database',
    category: (row) => row.datname,
    series: [
      { name: 'Commits', value: (row) => toNumber(row.xact_commit) },
      { name: 'Rollbacks', value: (row) => toNumber(row.xact_rollback) }
    ],
    columns: [
      { key: 'datname', text: 'Database' },
      { key: 'xact_commit', text: 'Commits', format: 'number' },
      { key: 'xact_rollback', text: 'Rollbacks', format: 'number' },
      { key: 'total_transactions', text: 'Total', format: 'number' }
    ]
  },
  {
    command: 'rows_activity',
    section: 'performance',
    width: 'one-half',
    title: 'Rows read and modified',
    description: 'Rows returned, inserted, updated and deleted per database.',
    chartType: 'grouped-bar',
    chartLabel:
      'Grouped bar chart showing rows returned, inserted, updated and deleted for each database',
    category: (row) => row.datname,
    series: [
      { name: 'Returned', value: (row) => toNumber(row.tup_returned) },
      { name: 'Inserted', value: (row) => toNumber(row.tup_inserted) },
      { name: 'Updated', value: (row) => toNumber(row.tup_updated) },
      { name: 'Deleted', value: (row) => toNumber(row.tup_deleted) }
    ],
    columns: [
      { key: 'datname', text: 'Database' },
      { key: 'tup_returned', text: 'Returned', format: 'number' },
      { key: 'tup_fetched', text: 'Fetched', format: 'number' },
      { key: 'tup_inserted', text: 'Inserted', format: 'number' },
      { key: 'tup_updated', text: 'Updated', format: 'number' },
      { key: 'tup_deleted', text: 'Deleted', format: 'number' }
    ]
  },
  {
    command: 'buffer_cache_hit_ratio',
    section: 'cache',
    width: 'one-half',
    title: 'Buffer cache hit ratio',
    description: 'Percentage of block reads served from the buffer cache.',
    chartType: 'bar',
    chartLabel:
      'Bar chart showing the buffer cache hit ratio percentage for each database',
    maxValue: 100,
    category: (row) => row.datname,
    series: [
      {
        name: 'Cache hit ratio (%)',
        value: (row) => toNumber(row.cache_hit_ratio_percent)
      }
    ],
    columns: [
      { key: 'datname', text: 'Database' },
      { key: 'blks_hit', text: 'Blocks hit', format: 'number' },
      { key: 'blks_read', text: 'Blocks read', format: 'number' },
      {
        key: 'cache_hit_ratio_percent',
        text: 'Hit ratio (%)',
        format: 'number'
      }
    ]
  },
  {
    command: 'idle_in_transaction',
    section: 'cache',
    width: 'one-half',
    title: 'Idle in transaction sessions',
    description: 'Sessions holding an open transaction while idle.',
    chartType: 'horizontal-bar',
    chartLabel:
      'Horizontal bar chart showing idle in transaction sessions by idle time in seconds',
    order: byDesc((row) => parseInterval(row.idle_duration) ?? 0),
    limit: 10,
    pidKey: 'pid',
    category: (row) => `PID ${row.pid} / ${row.usename || 'unknown'}`,
    series: [
      {
        name: 'Idle time (seconds)',
        value: (row) => parseInterval(row.idle_duration) ?? 0
      }
    ],
    columns: [
      { key: 'pid', text: 'PID', format: 'id' },
      { key: 'usename', text: 'User' },
      { key: 'datname', text: 'Database' },
      { key: 'transaction_age', text: 'Transaction age', format: 'duration' },
      { key: 'idle_duration', text: 'Idle for', format: 'duration' }
    ]
  },
  {
    command: 'locks_and_blocking',
    section: 'locks',
    width: 'one-half',
    title: 'Locks and blocking',
    description: 'Sessions waiting on a lock held by another session.',
    chartType: 'summary',
    summaryLabel: 'Blocked sessions',
    order: byDesc((row) => parseInterval(row.blocked_duration) ?? 0),
    pidKey: 'blocking_pid',
    columns: [
      { key: 'blocked_pid', text: 'Blocked PID', format: 'id' },
      { key: 'blocking_pid', text: 'Blocking PID', format: 'id' },
      { key: 'blocked_duration', text: 'Blocked for', format: 'duration' }
    ]
  },
  {
    command: 'prepared_transactions',
    section: 'locks',
    width: 'one-half',
    title: 'Prepared transactions',
    description: 'Two-phase commit transactions waiting to be committed.',
    chartType: 'summary',
    summaryLabel: 'Prepared transactions',
    columns: [
      { key: 'gid', text: 'Transaction ID' },
      { key: 'database', text: 'Database' },
      { key: 'owner', text: 'Owner' },
      { key: 'prepared', text: 'Prepared', format: 'date' },
      { key: 'age', text: 'Age', format: 'duration' }
    ]
  },
  {
    command: 'table_activity',
    section: 'tables',
    width: 'one-half',
    title: 'Table activity',
    description: 'Sequential and index scans on the busiest tables.',
    chartType: 'grouped-bar',
    chartLabel:
      'Grouped bar chart showing sequential and index scans for the busiest tables',
    order: byDesc((row) => toNumber(row.seq_scan) + toNumber(row.idx_scan)),
    limit: 10,
    category: tableName,
    series: [
      { name: 'Sequential scans', value: (row) => toNumber(row.seq_scan) },
      { name: 'Index scans', value: (row) => toNumber(row.idx_scan) }
    ],
    columns: [
      { key: tableName, text: 'Table' },
      { key: 'seq_scan', text: 'Sequential scans', format: 'number' },
      { key: 'idx_scan', text: 'Index scans', format: 'number' },
      { key: 'n_tup_ins', text: 'Inserts', format: 'number' },
      { key: 'n_tup_upd', text: 'Updates', format: 'number' },
      { key: 'n_tup_del', text: 'Deletes', format: 'number' },
      { key: 'n_live_tup', text: 'Live rows', format: 'number' },
      { key: 'n_dead_tup', text: 'Dead rows', format: 'number' },
      { key: 'last_autovacuum', text: 'Last autovacuum', format: 'date' }
    ]
  },
  {
    command: 'index_usage',
    section: 'tables',
    width: 'one-half',
    title: 'Index usage',
    description: 'The most scanned indexes.',
    chartType: 'horizontal-bar',
    chartLabel: 'Horizontal bar chart showing the number of scans per index',
    order: byDesc((row) => toNumber(row.idx_scan)),
    limit: 15,
    category: (row) => row.index_name,
    series: [{ name: 'Index scans', value: (row) => toNumber(row.idx_scan) }],
    columns: [
      { key: tableName, text: 'Table' },
      { key: 'index_name', text: 'Index' },
      { key: 'idx_scan', text: 'Scans', format: 'number' },
      { key: 'idx_tup_read', text: 'Tuples read', format: 'number' },
      { key: 'idx_tup_fetch', text: 'Tuples fetched', format: 'number' }
    ]
  },
  {
    command: 'largest_tables',
    section: 'storage',
    width: 'one-half',
    title: 'Largest tables',
    description: 'Tables by total size, including indexes.',
    chartType: 'horizontal-bar',
    chartLabel:
      'Horizontal bar chart showing the largest tables by total size in megabytes',
    order: byDesc((row) => parseSize(row.total_size) ?? 0),
    limit: 15,
    category: tableName,
    series: [
      {
        name: 'Total size (MB)',
        value: (row) => Math.round((parseSize(row.total_size) ?? 0) / 1024 ** 2)
      }
    ],
    columns: [
      { key: tableName, text: 'Table' },
      { key: 'total_size', text: 'Total size' },
      { key: 'table_size', text: 'Table size' },
      { key: 'index_size', text: 'Index size' },
      { key: 'n_live_tup', text: 'Live rows', format: 'number' },
      { key: 'n_dead_tup', text: 'Dead rows', format: 'number' }
    ]
  },
  {
    command: 'database_size',
    section: 'storage',
    width: 'one-half',
    title: 'Database size',
    description: 'Size on disk of each database.',
    chartType: 'horizontal-bar',
    chartLabel:
      'Horizontal bar chart showing the size of each database in megabytes',
    order: byDesc((row) => toNumber(row.size_bytes)),
    category: (row) => row.datname,
    series: [
      {
        name: 'Size (MB)',
        value: (row) => Math.round(toNumber(row.size_bytes) / 1024 ** 2)
      }
    ],
    columns: [
      { key: 'datname', text: 'Database' },
      { key: 'size_pretty', text: 'Size' },
      { key: 'size_bytes', text: 'Size (bytes)', format: 'number' }
    ]
  },
  {
    command: 'slow_queries',
    section: 'queries',
    width: 'one-half',
    title: 'Slowest queries',
    description: 'Queries with the most total execution time.',
    chartType: 'horizontal-bar',
    chartLabel:
      'Horizontal bar chart showing the slowest queries by total execution time in milliseconds',
    unavailableMessage: queryStatisticsUnavailable,
    order: byDesc((row) => toNumber(row.total_exec_time_ms)),
    limit: 10,
    category: queryLabel,
    series: [
      {
        name: 'Total execution time (ms)',
        value: (row) => toNumber(row.total_exec_time_ms)
      }
    ],
    columns: [
      { key: 'queryid', text: 'Query ID', format: 'id' },
      { key: 'calls', text: 'Calls', format: 'number' },
      { key: 'total_exec_time_ms', text: 'Total (ms)', format: 'number' },
      { key: 'mean_exec_time_ms', text: 'Mean (ms)', format: 'number' },
      { key: 'max_exec_time_ms', text: 'Max (ms)', format: 'number' },
      { key: 'rows', text: 'Rows', format: 'number' }
    ]
  },
  {
    command: 'shared_block_reads',
    section: 'queries',
    width: 'one-half',
    title: 'Highest shared block reads',
    description: 'Queries reading the most shared blocks from disk.',
    chartType: 'horizontal-bar',
    chartLabel:
      'Horizontal bar chart showing the queries with the highest shared block reads',
    unavailableMessage: queryStatisticsUnavailable,
    order: byDesc((row) => toNumber(row.shared_blks_read)),
    limit: 10,
    category: queryLabel,
    series: [
      {
        name: 'Shared blocks read',
        value: (row) => toNumber(row.shared_blks_read)
      }
    ],
    columns: [
      { key: 'queryid', text: 'Query ID', format: 'id' },
      { key: 'calls', text: 'Calls', format: 'number' },
      { key: 'shared_blks_read', text: 'Blocks read', format: 'number' },
      { key: 'shared_blks_hit', text: 'Blocks hit', format: 'number' },
      { key: 'hit_ratio_percent', text: 'Hit ratio (%)', format: 'number' }
    ]
  }
]

export function findPostgresMetric(command) {
  return postgresMetrics.find((metric) => metric.command === command)
}

const numericFormats = new Set(['number', 'id'])

function readColumn(column, row) {
  return typeof column.key === 'function' ? column.key(row) : row?.[column.key]
}

function formatCell(column, value) {
  if (value === null || value === undefined || value === '') {
    return ''
  }
  switch (column.format) {
    case 'number':
      return Number(value).toLocaleString('en-GB', {
        maximumFractionDigits: 2
      })
    case 'duration':
      return formatDuration(parseInterval(value))
    case 'date':
      return formatDateTime(value)
    default:
      return String(value)
  }
}

function buildTable(metric, rows) {
  const numeric = (column) =>
    numericFormats.has(column.format) ? { format: 'numeric' } : {}

  return {
    head: metric.columns.map((column) => ({
      text: column.text,
      ...numeric(column)
    })),
    rows: rows.map((row) =>
      metric.columns.map((column) => ({
        text: formatCell(column, readColumn(column, row)),
        ...numeric(column)
      }))
    )
  }
}

function buildChart(metric, rows) {
  if (metric.chartType === 'summary') {
    return null
  }

  return {
    type: metric.chartType,
    label: metric.chartLabel,
    maxValue: metric.maxValue ?? null,
    categories: rows.map((row) => String(metric.category(row))),
    series: metric.series.map((series) => ({
      name: series.name,
      values: rows.map((row) => series.value(row))
    }))
  }
}

/**
 * Shapes a command result into the chart and table for one metric.
 *
 * @param {typeof postgresMetrics[number]} metric
 * @param {unknown} result
 * @param {{ full?: boolean }} [options] full skips the summary row limit
 */
export function buildMetric(metric, result, { full = false } = {}) {
  const allRows = toRows(result)
  const sorted = metric.order ? [...allRows].sort(metric.order) : allRows
  const rows =
    metric.limit && !full ? sorted.slice(0, metric.limit) : [...sorted]

  return {
    totalRows: allRows.length,
    shownRows: rows.length,
    chart: rows.length ? buildChart(metric, rows) : null,
    table: buildTable(metric, rows)
  }
}

function countOf(results, command) {
  const result = results[command]
  return result === undefined ? null : toRows(result).length
}

/**
 * Headline figures for the top of the dashboard. A figure is null when its
 * command failed.
 *
 * @param {Record<string, unknown>} results command name to result
 */
export function buildHeadlineFigures(results) {
  const cacheRows = results.buffer_cache_hit_ratio
  const ratios = toRows(cacheRows)
    .map((row) => Number(row.cache_hit_ratio_percent))
    .filter(Number.isFinite)

  const bestRatio =
    cacheRows === undefined || !ratios.length ? null : Math.max(...ratios)

  return [
    {
      id: 'active-queries',
      label: 'Active queries',
      value: countOf(results, 'active_queries')
    },
    {
      id: 'blocked-sessions',
      label: 'Blocked sessions',
      value: countOf(results, 'locks_and_blocking')
    },
    {
      id: 'idle-transactions',
      label: 'Idle in transaction',
      value: countOf(results, 'idle_in_transaction')
    },
    {
      id: 'cache-hit',
      label: 'Best cache hit ratio',
      value: bestRatio,
      suffix: '%'
    }
  ].map((figure) => ({
    ...figure,
    text:
      figure.value === null
        ? 'Not available'
        : `${figure.value.toLocaleString('en-GB', { maximumFractionDigits: 2 })}${figure.suffix ?? ''}`
  }))
}
