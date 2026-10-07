import { statusCodes } from '../common/constants/status-codes.js'

export const unauthorisedPath = '/unauthorised'

export const unauthorised = {
  plugin: {
    name: 'unauthorised',
    register(server) {
      server.route({
        method: 'GET',
        path: unauthorisedPath,
        options: {
          auth: {
            strategy: 'session',
            mode: 'try'
          }
        },
        handler(_request, h) {
          return h
            .view('error/index', {
              pageTitle: 'Unauthorised',
              heading: 'Sorry, you do not have permission to view this page',
              message:
                'If you think you should have access, contact your administrator.'
            })
            .code(statusCodes.forbidden)
        }
      })
    }
  }
}
