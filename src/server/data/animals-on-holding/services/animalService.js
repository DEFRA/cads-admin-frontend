import { createApiClient } from '../../../common/clients/api-client.js'
import { getConfig } from '../../../../config/config.js'

/** @typedef {import('../models/animalsOnHolding.js').AnimalsOnHolding} AnimalsOnHolding */
/** @typedef {import('../models/animalDetails.js').AnimalDetails} AnimalDetails */

// CTS parallel import monitoring endpoints in cads-data-service (CDS)
const basePath = '/api/v1/bovine/animals'

function cdsClient(request) {
  return createApiClient(request, getConfig().get('cadsCdsBackendUrl'))
}

/**
 * @param {import('@hapi/hapi').Request} request
 * @param {{ cph?: string, breedCode?: string, sex?: 'Female' | 'Male' }} filter
 * @param {{ pageSize?: number, page?: number }} paging
 * @param {{ orderBy?: string, sortDirection?: 'Asc' | 'Desc' }} sorting
 * @returns {Promise<AnimalsOnHolding>}
 */
export async function getAnimalsOnHolding(request, filter, paging, sorting) {
  const mergedObject = { ...filter, ...paging, ...sorting }
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(mergedObject)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value))
    }
  }

  const queryString = query.toString()
  const url = `${basePath}${queryString ? `?${queryString}` : ''}`
  const response = await cdsClient(request).get(url)
  return response.result ?? response
}

/**
 * @param {import('@hapi/hapi').Request} request
 * @param {string} identifier
 * @returns {Promise<AnimalDetails>}
 */
export async function getAnimalDetails(request, identifier) {
  const url = `${basePath}/${encodeURIComponent(identifier)}`
  const response = await cdsClient(request).get(url)
  return response.result ?? response
}
