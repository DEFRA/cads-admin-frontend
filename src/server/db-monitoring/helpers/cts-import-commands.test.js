import {
  buildResultTable,
  findCtsImportCommand,
  formatDateTime
} from './cts-import-commands.js'

describe('#findCtsImportCommand', () => {
  test.each(['summary', 'plan', 'deferred_errors'])(
    'Should find the %s command',
    (value) => {
      expect(findCtsImportCommand(value).value).toBe(value)
    }
  )

  test('Should not find an unknown command', () => {
    expect(findCtsImportCommand('drop_everything')).toBeUndefined()
  })
})

describe('#buildResultTable', () => {
  const command = findCtsImportCommand('deferred_errors')

  test('Should build head and rows in column order', () => {
    const table = buildResultTable(command, [
      { rows: 1234, error: 'duplicate key', table_name: 'cts_animal' }
    ])

    expect(table.head).toEqual([
      { text: 'Table' },
      { text: 'Error' },
      { text: 'Rows', format: 'numeric' }
    ])
    expect(table.rows).toEqual([
      [
        { text: 'cts_animal' },
        { text: 'duplicate key' },
        { text: '1,234', format: 'numeric' }
      ]
    ])
  })

  test('Should treat a non-array result as no rows', () => {
    expect(buildResultTable(command, {}).rows).toEqual([])
  })

  test('Should show missing values as empty cells and format dates', () => {
    const plan = findCtsImportCommand('plan')
    const [row] = buildResultTable(plan, [
      { table_name: 'cts_animal', updated_at: '2026-10-01T09:30:00Z' }
    ]).rows

    const cell = (key) =>
      row[plan.columns.findIndex((column) => column.key === key)].text

    expect(cell('status')).toBe('')
    expect(cell('updated_at')).toBe(formatDateTime('2026-10-01T09:30:00Z'))
  })
})
