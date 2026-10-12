// Postgres's backend process IDs are 32-bit integers
const maxPid = 2147483647
const pidPattern = /^[1-9]\d{0,9}$/

export const postgresActions = [
  {
    id: 'cancel-query',
    command: 'cancel_query',
    title: 'Cancel a running query',
    description:
      'Stops the query a session is running. The session stays connected.',
    buttonText: 'Cancel query',
    requiresPid: true,
    messages: {
      success: (pid) => `Cancel request sent to process ${pid}`,
      notFound: (pid) => `No running process with ID ${pid} was found`
    }
  },
  {
    id: 'terminate-query',
    command: 'terminate_query',
    title: 'Terminate a backend session',
    description:
      'Ends the session and its connection. Any open transaction is rolled back.',
    warningText:
      'Terminating a session disconnects the application using it and rolls back its open transaction.',
    buttonText: 'Terminate session',
    buttonClasses: 'govuk-button--warning',
    requiresPid: true,
    messages: {
      success: (pid) => `Process ${pid} has been terminated`,
      notFound: (pid) => `No running process with ID ${pid} was found`
    }
  },
  {
    id: 'reset-query-statistics',
    command: 'reset_pg_stat_statements',
    title: 'Reset query statistics',
    description:
      'Clears the statistics behind Slowest queries and Highest shared block reads.',
    warningText:
      'Query statistics cannot be recovered once they have been reset.',
    buttonText: 'Reset query statistics',
    buttonClasses: 'govuk-button--warning',
    requiresPid: false,
    messages: {
      success: () => 'Query statistics have been reset',
      notFound: () => 'Query statistics could not be reset'
    }
  }
]

export const actionErrorMessages = {
  forbidden: 'You do not have permission to run this action',
  badRequest: 'The database monitoring service could not process the action',
  unavailable:
    'There was a problem contacting the database monitoring service. Try again later.'
}

// Outcomes are passed back to the page in the query string after the
// redirect, so only these fixed values are ever turned into a message
export const actionOutcomes = [
  'success',
  'not-found',
  'forbidden',
  'bad-request',
  'unavailable'
]

export function findPostgresAction(id) {
  return postgresActions.find((action) => action.id === id)
}

/**
 * @param {unknown} value
 * @returns {number | null}
 */
export function parsePid(value) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!pidPattern.test(text)) {
    return null
  }
  const pid = Number(text)
  return pid <= maxPid ? pid : null
}

export const pidErrorMessage =
  'Enter a process ID as a whole number, like 12345'

/**
 * The notification banner for an action outcome read back from the query
 * string. Returns null for anything that is not a known action and outcome.
 *
 * @param {{ action?: string, outcome?: string, pid?: string }} query
 */
export function describeActionOutcome(query) {
  const action = findPostgresAction(query?.action)
  if (!action || !actionOutcomes.includes(query?.outcome)) {
    return null
  }

  const pid = action.requiresPid ? parsePid(query.pid) : null
  if (action.requiresPid && pid === null) {
    return null
  }

  switch (query.outcome) {
    case 'success':
      return { type: 'success', text: action.messages.success(pid) }
    case 'not-found':
      return { type: 'important', text: action.messages.notFound(pid) }
    case 'forbidden':
      return { type: 'important', text: actionErrorMessages.forbidden }
    case 'bad-request':
      return { type: 'important', text: actionErrorMessages.badRequest }
    default:
      return { type: 'important', text: actionErrorMessages.unavailable }
  }
}
