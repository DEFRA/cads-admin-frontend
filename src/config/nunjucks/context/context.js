import path from 'node:path'
import { readFileSync } from 'node:fs'

import { getConfig } from '../../config.js'
import { buildNavigation } from './build-navigation.js'
import { createLogger } from '../../../server/common/helpers/logging/logger.js'

const logger = createLogger()

// Lazy-loaded manifest cache
let webpackManifest = null

function loadManifestOnce(manifestPath) {
  if (webpackManifest) {
    return webpackManifest
  }

  try {
    webpackManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
  } catch (error) {
    logger.error(`Webpack ${path.basename(manifestPath)} not found`)
    webpackManifest = {} // fallback to empty manifest
  }

  return webpackManifest
}

export function context(request) {
  const config = getConfig()

  const assetPath = config.get('assetPath')
  const manifestPath = path.join(
    config.get('root'),
    '.public/assets-manifest.json'
  )

  const manifest = loadManifestOnce(manifestPath)

  return {
    assetPath: `${assetPath}/assets`,
    serviceName: config.get('serviceName'),
    serviceUrl: '/',
    breadcrumbs: [],
    navigation: buildNavigation(request),

    getAssetPath(asset) {
      const webpackAssetPath = manifest?.[asset]
      return `${assetPath}/${webpackAssetPath ?? asset}`
    }
  }
}
