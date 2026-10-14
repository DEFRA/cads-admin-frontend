import { createServer } from '../../server.js'
import { statusCodes } from '../../common/constants/status-codes.js'

vi.mock('../../../auth/auth-required.js', () => ({
  authRequired: vi.fn((_req, h) => h.continue)
}))

vi.mock('../../../auth/helpers/extract-scopes.js', () => ({
  hasAnyScope: vi.fn(() => true)
}))

describe('#sqsQueueMessagesController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET SQS Messages page', async () => {
    let response = null

    beforeAll(async () => {
      response = await server.inject({
        method: 'GET',
        url: '/dashboard/monitoring/sqs/test-client/test-queue/messages'
      })
    })

    test('Should show SQS Messages page', async () => {
      expect(response.result).toEqual(
        expect.stringContaining('SQS Queue Messages |')
      )
      expect(response.statusCode).toBe(statusCodes.ok)
    })
  })
})
