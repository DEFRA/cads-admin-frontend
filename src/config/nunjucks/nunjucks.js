import path from 'path'
import nunjucks from 'nunjucks'
import hapiVision from '@hapi/vision'
import { fileURLToPath } from 'node:url'

import { getConfig } from '../config.js'
import { context } from './context/context.js'
import * as filters from './filters/filters.js'
import * as globals from './globals/globals.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))

// Lazily created shared environment instance
let nunjucksEnvironment = null

export function getNunjucksEnvironment() {
  if (nunjucksEnvironment) {
    return nunjucksEnvironment
  }

  const config = getConfig()

  nunjucksEnvironment = nunjucks.configure(
    [
      'node_modules/govuk-frontend/dist/',
      path.resolve(dirname, '../../server/common/templates'),
      path.resolve(dirname, '../../server/common/components')
    ],
    {
      autoescape: true,
      throwOnUndefined: false,
      trimBlocks: true,
      lstripBlocks: true,
      watch: config.get('nunjucks.watch'),
      noCache: config.get('nunjucks.noCache')
    }
  )

  // Register globals
  Object.entries(globals).forEach(([name, value]) => {
    nunjucksEnvironment.addGlobal(name, value)
  })

  // Register filters
  Object.entries(filters).forEach(([name, filter]) => {
    nunjucksEnvironment.addFilter(name, filter)
  })

  return nunjucksEnvironment
}

export const nunjucksConfig = {
  plugin: hapiVision,
  options: {
    engines: {
      njk: {
        compile(src, options) {
          const template = nunjucks.compile(src, options.environment)
          return (ctx) => template.render(ctx)
        }
      }
    },
    compileOptions: {
      environment: getNunjucksEnvironment()
    },
    relativeTo: path.resolve(dirname, '../..'),
    path: 'server',
    isCached: getConfig().get('isProduction'),
    context
  }
}
