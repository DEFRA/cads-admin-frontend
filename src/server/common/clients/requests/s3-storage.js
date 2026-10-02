import { createApiClient } from '../api-client.js'
import { getConfig } from '../../../../config/config.js'

// Read-only storage management endpoints in cads-data-service (CDS)
const basePath = '/api/v1/storage/s3'

function cdsClient(request) {
  return createApiClient(request, getConfig().get('cadsCdsBackendUrl'))
}

function withQuery(path, params) {
  const query = new URLSearchParams()
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(name, String(value))
    }
  }
  const queryString = query.toString()
  return queryString ? `${path}?${queryString}` : path
}

function bucketPath(clientName, path) {
  return `${basePath}/buckets/${encodeURIComponent(clientName)}${path}`
}

/**
 * @typedef {{ clientName: string, bucketName: string, region?: string, totalObjects?: number }} StorageBucket
 * @typedef {{ key: string, size: number, lastModified: string | null, storageClass: string | null }} StorageObject
 * @typedef {{ folders: string[], objects: StorageObject[], isTruncated: boolean, nextContinuationToken: string | null }} StorageListing
 * @typedef {{ rows: string[], reachedEnd: boolean }} StorageRowSlice
 */

/**
 * @param {import('@hapi/hapi').Request} request
 * @returns {Promise<StorageBucket[]>}
 */
export function listBuckets(request) {
  return cdsClient(request).get(`${basePath}/buckets`)
}

/**
 * @param {import('@hapi/hapi').Request} request
 * @param {string} clientName
 * @param {{ prefix?: string, delimiter?: string, maxKeys?: number, continuationToken?: string }} options
 * @returns {Promise<StorageListing>}
 */
export function listObjects(request, clientName, options) {
  return cdsClient(request).get(
    withQuery(bucketPath(clientName, '/objects'), options)
  )
}

/**
 * Reads lines [startRow, startRow + rowCount) of an object. The backend
 * streams the object and stops reading once the slice is complete.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {string} clientName
 * @param {{ key: string, startRow: number, rowCount: number, delimiter?: string }} options
 * @returns {Promise<StorageRowSlice>}
 */
export function getObjectRows(request, clientName, options) {
  return cdsClient(request).get(
    withQuery(bucketPath(clientName, '/object/rows'), {
      delimiter: '\n',
      ...options
    })
  )
}
