import { createApiClient } from '../api-client.js'
import { getConfig } from '../../../../config/config.js'

// Postgres monitoring and admin commands in cads-data-service (CDS)
const basePath = '/api/v1/systemadmin/db-admin-execute-command'

function cdsClient(request) {
  return createApiClient(request, getConfig().get('cadsCdsBackendUrl'))
}

/**
 * @param {import('@hapi/hapi').Request} request
 * @param {string} command
 * @param {Record<string, unknown>} [args]
 * @returns {Promise<{ command: string, result: unknown }>}
 */
export function executeDbAdminCommand(request, command, args) {
  return cdsClient(request).post(
    basePath,
    args ? { command, args } : { command }
  )
}
