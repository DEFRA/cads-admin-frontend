import { formatDate } from '../../../config/nunjucks/filters/format-date.js'

const dateTimeFormat = 'd MMMM yyyy, HH:mm:ss'

export const ctsImportCommands = [
  {
    value: 'summary',
    text: 'Summary',
    hint: 'Totals for the run grouped by table status',
    columns: [
      { key: 'status', text: 'Status' },
      { key: 'table_count', text: 'Tables', numeric: true },
      { key: 'percent_remaining', text: 'Remaining (%)', numeric: true },
      { key: 'total_source_rows', text: 'Source rows', numeric: true },
      { key: 'total_migrated_rows', text: 'Migrated rows', numeric: true },
      { key: 'total_deferred_rows', text: 'Deferred rows', numeric: true },
      { key: 'total_remaining_rows', text: 'Remaining rows', numeric: true }
    ]
  },
  {
    value: 'plan',
    text: 'Plan',
    hint: 'Progress of each table in dependency order',
    columns: [
      { key: 'plan_order', text: 'Order', numeric: true },
      { key: 'dependency_depth', text: 'Depth', numeric: true },
      { key: 'table_name', text: 'Table' },
      { key: 'status', text: 'Status' },
      { key: 'remaining_percent', text: 'Remaining (%)', numeric: true },
      { key: 'elapsed_hours', text: 'Elapsed (hours)', numeric: true },
      { key: 'elapsed_minutes', text: 'Elapsed (minutes)', numeric: true },
      { key: 'original_rows', text: 'Original rows', numeric: true },
      { key: 'migrated_rows', text: 'Migrated rows', numeric: true },
      { key: 'deferred_rows', text: 'Deferred rows', numeric: true },
      {
        key: 'remaining_bulk_rows',
        text: 'Remaining bulk rows',
        numeric: true
      },
      {
        key: 'migrated_rows_per_minute',
        text: 'Rows per minute',
        numeric: true
      },
      {
        key: 'migrated_rows_per_second',
        text: 'Rows per second',
        numeric: true
      },
      { key: 'active_workers', text: 'Active workers', numeric: true },
      { key: 'stale_workers', text: 'Stale workers', numeric: true },
      { key: 'updated_at', text: 'Updated', date: true },
      { key: 'last_error_message', text: 'Last error' }
    ]
  },
  {
    value: 'deferred_errors',
    text: 'Deferred errors',
    hint: 'Deferred rows counted by table and error',
    columns: [
      { key: 'table_name', text: 'Table' },
      { key: 'error', text: 'Error' },
      { key: 'rows', text: 'Rows', numeric: true }
    ]
  }
]

export function findCtsImportCommand(value) {
  return ctsImportCommands.find((command) => command.value === value)
}

export function formatDateTime(value) {
  return value ? formatDate(value, dateTimeFormat) : ''
}

function formatCell(column, value) {
  if (value === null || value === undefined) {
    return ''
  }
  if (column.date) {
    return formatDateTime(value)
  }
  if (typeof value === 'number') {
    return value.toLocaleString('en-GB')
  }
  return String(value)
}

export function buildResultTable(command, result) {
  const rows = Array.isArray(result) ? result : []

  return {
    head: command.columns.map((column) => ({
      text: column.text,
      ...(column.numeric ? { format: 'numeric' } : {})
    })),
    rows: rows.map((row) =>
      command.columns.map((column) => ({
        text: formatCell(column, row?.[column.key]),
        ...(column.numeric ? { format: 'numeric' } : {})
      }))
    )
  }
}
