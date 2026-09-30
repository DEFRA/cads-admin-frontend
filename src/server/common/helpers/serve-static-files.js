import { getConfig } from '../../../config/config.js'
import { statusCodes } from '../constants/status-codes.js'

export function getStaticFilesToServe() {
  const config = getConfig()

  return {
    plugin: {
      name: 'staticFiles',
      register(server) {
        server.route([
          {
            method: 'GET',
            path: '/favicon.ico',
            options: {
              auth: false,
              cache: {
                expiresIn: config.get('staticCacheTimeout'),
                privacy: 'private'
              }
            },
            handler(_request, h) {
              return h
                .response()
                .code(statusCodes.noContent)
                .type('image/x-icon')
            }
          },
          {
            method: 'GET',
            path: `${config.get('assetPath')}/{param*}`,
            options: {
              auth: false,
              cache: {
                expiresIn: config.get('staticCacheTimeout'),
                privacy: 'private'
              }
            },
            handler: {
              directory: {
                path: '.',
                redirectToSlash: true
              }
            }
          }
        ])
      }
    }
  }
}
