import {
  getCtsImportRuns,
  runCtsImportCommand
} from '../common/clients/requests/db-admin-cts-import.js'
import { statusCodes } from '../common/constants/status-codes.js'
import {
  buildResultTable,
  ctsImportCommands,
  findCtsImportCommand,
  formatDateTime
} from './helpers/cts-import-commands.js'
import { describeCtsImportError } from './helpers/errors.js'

export const ctsImportPath = '/db-monitoring/cts-import'

const pageTitle = 'CTS Parallel Import Monitoring'

const breadcrumbs = [
  { text: 'Dashboard', href: '/dashboard' },
  { text: 'DB Monitoring', href: '/db-monitoring' },
  { text: pageTitle }
]

const runIdPattern = /^[1-9]\d*$/

function validate(query) {
  const errors = {}
  if (!runIdPattern.test(query.runId ?? '')) {
    errors.runId = 'Select an import run'
  }
  if (!findCtsImportCommand(query.command)) {
    errors.command = 'Select a command'
  }
  return errors
}

function runItems(runs, selectedRunId) {
  return runs.map((run) => ({
    value: String(run.runId),
    text: `Run ${run.runId}: ${run.status}, started ${formatDateTime(run.createdAt)}`,
    selected: String(run.runId) === selectedRunId
  }))
}

function commandItems(selectedCommand) {
  return ctsImportCommands.map((command) => ({
    value: command.value,
    text: command.text,
    hint: { text: command.hint },
    checked: command.value === selectedCommand
  }))
}

function logFailure(request, error, statusCode) {
  if (statusCode === statusCodes.badGateway) {
    request.logger?.error(error, 'CTS import monitoring API request failed')
  }
}

export const ctsImportController = {
  async handler(request, h) {
    const query = request.query
    const submitted = query.runId !== undefined || query.command !== undefined
    const fieldErrors = submitted ? validate(query) : {}
    const shouldRunCommand = submitted && !Object.keys(fieldErrors).length
    const command = findCtsImportCommand(query.command)

    const [runsOutcome, commandOutcome] = await Promise.allSettled([
      getCtsImportRuns(request),
      shouldRunCommand
        ? runCtsImportCommand(request, command.value, Number(query.runId))
        : Promise.resolve(null)
    ])

    let statusCode = statusCodes.ok
    let errorMessage = null

    for (const outcome of [runsOutcome, commandOutcome]) {
      if (outcome.status === 'rejected' && !errorMessage) {
        const described = describeCtsImportError(outcome.reason)
        logFailure(request, outcome.reason, described.statusCode)
        statusCode = described.statusCode
        errorMessage = described.message
      }
    }

    const runs =
      runsOutcome.status === 'fulfilled' ? (runsOutcome.value?.runs ?? []) : []
    const selectedRunId = query.runId ?? String(runs[0]?.runId ?? '')
    const selectedCommand = query.command ?? ctsImportCommands[0].value

    const errorList = [
      ...Object.entries(fieldErrors).map(([field, text]) => ({
        text,
        href: `#${field}`
      })),
      ...(errorMessage ? [{ text: errorMessage }] : [])
    ]

    const result =
      commandOutcome.status === 'fulfilled' && commandOutcome.value
        ? {
            caption: `${command.text} for run ${query.runId}`,
            ...buildResultTable(command, commandOutcome.value.result)
          }
        : null

    return h
      .view('db-monitoring/cts-import', {
        pageTitle: errorList.length ? `Error: ${pageTitle}` : pageTitle,
        heading: pageTitle,
        breadcrumbs,
        viewModel: {
          formAction: ctsImportPath,
          runsLoaded: runsOutcome.status === 'fulfilled',
          runItems: runItems(runs, selectedRunId),
          commandItems: commandItems(selectedCommand),
          fieldErrors,
          errorList,
          result
        }
      })
      .code(
        Object.keys(fieldErrors).length ? statusCodes.badRequest : statusCode
      )
  }
}
