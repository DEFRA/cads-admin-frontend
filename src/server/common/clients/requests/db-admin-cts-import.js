import { createApiClient } from '../api-client.js'
import { getConfig } from '../../../../config/config.js'

// CTS parallel import monitoring endpoints in cads-data-service (CDS)
const basePath = '/api/v1/systemadmin/db-admin-cts-import'

function cdsClient(request) {
  return createApiClient(request, getConfig().get('cadsCdsBackendUrl'))
}

function toRun(row) {
  return {
    runId: row.run_id,
    status: row.status,
    createdAt: row.created_at,
    bulkCompletedAt: row.bulk_completed_at,
    completedAt: row.completed_at
  }
}

export async function getCtsImportRuns(request) {
  const response = await cdsClient(request).post(basePath, { command: 'runs' })
  const rows = Array.isArray(response?.result) ? response.result : []
  return rows.map(toRun)
}

export function runCtsImportCommand(request, command, runId) {
  return cdsClient(request).post(basePath, {
    command,
    args: { run_id: runId }
  })
}
