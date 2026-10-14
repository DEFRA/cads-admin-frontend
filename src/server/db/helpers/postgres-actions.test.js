import {
  actionErrorMessages,
  describeActionOutcome,
  findPostgresAction,
  parsePid,
  postgresActions
} from './postgres-actions.js'

describe('#postgresActions', () => {
  test('Should offer cancel and terminate with a PID, and reset without', () => {
    expect(
      postgresActions.map((action) => [action.command, action.requiresPid])
    ).toEqual([
      ['cancel_query', true],
      ['terminate_query', true],
      ['reset_pg_stat_statements', false]
    ])
  })

  test('Should find an action by its id', () => {
    expect(findPostgresAction('terminate-query').command).toBe(
      'terminate_query'
    )
    expect(findPostgresAction('drop-database')).toBeUndefined()
  })
})

describe('#parsePid', () => {
  test.each([
    ['12345', 12345],
    [' 42 ', 42],
    ['2147483647', 2147483647]
  ])('Should accept %s', (value, pid) => {
    expect(parsePid(value)).toBe(pid)
  })

  test.each([
    '',
    'abc',
    '0',
    '-1',
    '12.5',
    '1e5',
    '012',
    '2147483648',
    '99999999999',
    undefined,
    12345
  ])('Should reject %s', (value) => {
    expect(parsePid(value)).toBeNull()
  })
})

describe('#describeActionOutcome', () => {
  test('Should describe a successful cancel as a success banner', () => {
    expect(
      describeActionOutcome({
        action: 'cancel-query',
        outcome: 'success',
        pid: '123'
      })
    ).toEqual({ type: 'success', text: 'Cancel request sent to process 123' })
  })

  test('Should say when there was no process to terminate', () => {
    expect(
      describeActionOutcome({
        action: 'terminate-query',
        outcome: 'not-found',
        pid: '123'
      })
    ).toEqual({
      type: 'important',
      text: 'No running process with ID 123 was found'
    })
  })

  test('Should describe a reset without a PID', () => {
    expect(
      describeActionOutcome({
        action: 'reset-query-statistics',
        outcome: 'success'
      })
    ).toEqual({ type: 'success', text: 'Query statistics have been reset' })
  })

  test.each([
    ['forbidden', actionErrorMessages.forbidden],
    ['bad-request', actionErrorMessages.badRequest],
    ['unavailable', actionErrorMessages.unavailable]
  ])('Should describe the %s error', (outcome, text) => {
    expect(
      describeActionOutcome({ action: 'cancel-query', outcome, pid: '1' })
    ).toEqual({ type: 'important', text })
  })

  test.each([
    [{}],
    [{ action: 'drop-database', outcome: 'success', pid: '1' }],
    [{ action: 'cancel-query', outcome: '<b>pwned</b>', pid: '1' }],
    [{ action: 'cancel-query', outcome: 'success', pid: '<b>1</b>' }],
    [{ action: 'cancel-query', outcome: 'success' }]
  ])('Should ignore an unknown outcome %o', (query) => {
    expect(describeActionOutcome(query)).toBeNull()
  })
})
