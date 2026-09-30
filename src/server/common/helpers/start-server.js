/* istanbul ignore file */

import { createServer } from '../../server.js'
import { getConfig } from '../../../config/config.js'

async function startServer() {
  const config = getConfig()
  const server = await createServer()
  await server.start()

  server.logger.info('Server started successfully')
  server.logger.info(
    `Access your frontend on http://localhost:${config.get('port')}`
  )

  return server
}

export { startServer }
