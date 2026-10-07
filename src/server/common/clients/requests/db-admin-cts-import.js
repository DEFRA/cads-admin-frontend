import { createApiClient } from '../api-client.js'
import { getConfig } from '../../../../config/config.js'

// CTS parallel import monitoring endpoints in cads-data-service (CDS)
const basePath = '/api/v1/systemadmin/db-admin-cts-import'

function cdsClient(request) {
  return createApiClient(request, getConfig().get('cadsCdsBackendUrl'))
}

export function getCtsImportRuns(request) {
  return cdsClient(request).get(`${basePath}/runs`)
}
export function runCtsImportCommand(request, command, runId) {
  return cdsClient(request).post(basePath, {
    command,
    args: { run_id: runId }
  })
}
