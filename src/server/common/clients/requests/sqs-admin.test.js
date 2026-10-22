import { createApiClient } from '../api-client.js'
import { statusCodes } from '../../constants/status-codes.js'
import {
  listQueues,
  getQueueMetrics,
  getQueueMessages,
  replayDLQMessages,
  replayDLQMessage
} from './sqs-admin.js'

vi.mock('../api-client.js', () => ({
  createApiClient: vi.fn()
}))

vi.mock('../../../../config/config.js', () => ({
  getConfig: () => ({
    get: (key) => {
      if (key === 'cadsCdsBackendUrl') {
        return 'https://cds.example'
      }
      if (key === 'cadsBridgeBackendUrl') {
        return 'https://bridge.example'
      }
      return null
    }
  })
}))

describe('#sqs-admin requests', () => {
  const request = { logger: { error: vi.fn() } }
  const client = { get: vi.fn(), post: vi.fn() }

  beforeEach(() => {
    vi.clearAllMocks()
    createApiClient.mockReturnValue(client)
  })

  describe('#listQueues', () => {
    // temporary skip until we can get the bridge client to respond with queues
    test.skip('Should map queues for both clients when both respond successfully', async () => {
      client.get
        .mockResolvedValueOnce({
          queues: [
            {
              name: 'CadsCds',
              queueUrl: 'https://sqs.example/queues/cads-cds-queue',
              dlqQueueUrl: 'https://sqs.example/queues/cads-cds-queue-dlq'
            }
          ]
        })
        .mockResolvedValueOnce({
          queues: [
            {
              name: 'CadsBridge',
              queueUrl: 'https://sqs.example/queues/cads-bridge-queue',
              dlqQueueUrl: 'https://sqs.example/queues/cads-bridge-queue-dlq'
            }
          ]
        })

      const result = await listQueues(request)

      expect(result).toEqual([
        {
          name: 'CADS Data Service',
          slug: 'cads-cds',
          adminEnabled: true,
          queues: [
            {
              name: 'CadsCds',
              queueName: 'cads-cds-queue',
              dlqName: 'cads-cds-queue-dlq'
            }
          ]
        },
        {
          name: 'CADS Bridge',
          slug: 'cads-bridge',
          adminEnabled: true,
          queues: [
            {
              name: 'CadsBridge',
              queueName: 'cads-bridge-queue',
              dlqName: 'cads-bridge-queue-dlq'
            }
          ]
        }
      ])
      expect(createApiClient).toHaveBeenCalledWith(
        request,
        'https://cds.example'
      )
      expect(createApiClient).toHaveBeenCalledWith(
        request,
        'https://bridge.example'
      )
    })
    // temporary skip until we can get the bridge client to respond with queues
    test.skip('Should mark a client as admin disabled when it responds with not found', async () => {
      client.get
        .mockRejectedValueOnce({ output: { statusCode: statusCodes.notFound } })
        .mockResolvedValueOnce({ queues: [] })

      const result = await listQueues(request)

      expect(result[0]).toEqual({
        name: 'CADS Data Service',
        slug: 'cads-cds',
        adminEnabled: false,
        queues: []
      })
    })

    // temporary skip until we can get the bridge client to respond with queues
    test.skip('Should rethrow errors that are not a not found response', async () => {
      const error = {
        output: { statusCode: statusCodes.badRequest },
        message: 'Boom'
      }
      client.get.mockRejectedValueOnce(error)

      await expect(listQueues(request)).rejects.toBe(error)
    })
  })

  describe('#getQueueMetrics', () => {
    test('Should get queue and dlq metrics for the cads-cds client', async () => {
      client.get
        .mockResolvedValueOnce({ messages: 1 })
        .mockResolvedValueOnce({ messages: 2 })

      const result = await getQueueMetrics(request, 'cads-cds', 'test-queue')

      expect(result).toEqual([{ messages: 1 }, { messages: 2 }])
      expect(createApiClient).toHaveBeenCalledWith(
        request,
        'https://cds.example'
      )
      expect(client.get).toHaveBeenNthCalledWith(
        1,
        '/api/v1/systemadmin/sqs/queues/test-queue/metrics'
      )
      expect(client.get).toHaveBeenNthCalledWith(
        2,
        '/api/v1/systemadmin/sqs/queues/test-queue/dlq/metrics'
      )
    })

    test('Should get metrics for the cads-bridge client', async () => {
      client.get.mockResolvedValue({})

      await getQueueMetrics(request, 'cads-bridge', 'test-queue')

      expect(createApiClient).toHaveBeenCalledWith(
        request,
        'https://bridge.example'
      )
    })

    test('Should wrap errors in a Boom bad request', async () => {
      client.get.mockRejectedValue(new Error('Metrics failed'))

      await expect(
        getQueueMetrics(request, 'cads-cds', 'test-queue')
      ).rejects.toMatchObject({
        isBoom: true,
        output: { statusCode: statusCodes.badRequest }
      })
    })
  })

  describe('#getQueueMessages', () => {
    test('Should request dlq messages with the max messages query param', async () => {
      client.get.mockResolvedValue({ messages: [] })

      await getQueueMessages(request, 'cads-cds', 'test-queue', 'dlq', 5)

      expect(client.get).toHaveBeenCalledWith(
        '/api/v1/systemadmin/sqs/queues/test-queue/dlq/messages?maxMessages=5'
      )
    })

    test('Should request standard queue messages when queueType is not dlq', async () => {
      client.get.mockResolvedValue({ messages: [] })

      await getQueueMessages(
        request,
        'cads-bridge',
        'test-queue',
        'messages',
        10
      )

      expect(createApiClient).toHaveBeenCalledWith(
        request,
        'https://bridge.example'
      )
      expect(client.get).toHaveBeenCalledWith(
        '/api/v1/systemadmin/sqs/queues/test-queue/messages?maxMessages=10'
      )
    })

    test('Should wrap errors in a Boom bad request', async () => {
      client.get.mockRejectedValue(new Error('Messages failed'))

      await expect(
        getQueueMessages(request, 'cads-cds', 'test-queue', 'dlq', 10)
      ).rejects.toMatchObject({
        isBoom: true,
        output: { statusCode: statusCodes.badRequest }
      })
    })
  })

  describe('#replayDLQMessages', () => {
    test('Should post to the dlq replay endpoint for the cads-cds client', async () => {
      const response = { queue: 'CadsCds', moved: 2, failed: 0, errors: [] }
      client.post.mockResolvedValue(response)

      const result = await replayDLQMessages(request, 'cads-cds', 'test-queue')

      expect(result).toEqual(response)
      expect(createApiClient).toHaveBeenCalledWith(
        request,
        'https://cds.example'
      )
      expect(client.post).toHaveBeenCalledWith(
        '/api/v1/systemadmin/sqs/queues/test-queue/dlq/replay',
        { BatchSize: 10 }
      )
    })

    test('Should post to the dlq replay endpoint for the cads-bridge client', async () => {
      client.post.mockResolvedValue({
        queue: 'CadsBridge',
        moved: 0,
        failed: 0,
        errors: []
      })

      await replayDLQMessages(request, 'cads-bridge', 'test-queue')

      expect(createApiClient).toHaveBeenCalledWith(
        request,
        'https://bridge.example'
      )
    })

    test('Should wrap errors in a Boom bad request', async () => {
      client.post.mockRejectedValue(new Error('Replay failed'))

      await expect(
        replayDLQMessages(request, 'cads-cds', 'test-queue')
      ).rejects.toMatchObject({
        isBoom: true,
        output: { statusCode: statusCodes.badRequest }
      })
    })
  })

  describe('#replayDLQMessage', () => {
    test('Should post to the single message dlq replay endpoint for the cads-cds client', async () => {
      const response = {
        queue: 'CadsCds',
        moved: 1,
        failed: 0,
        errors: [],
        messageId: 'message-1'
      }
      client.post.mockResolvedValue(response)

      const result = await replayDLQMessage(
        request,
        'cads-cds',
        'test-queue',
        'message-1'
      )

      expect(result).toEqual(response)
      expect(createApiClient).toHaveBeenCalledWith(
        request,
        'https://cds.example'
      )
      expect(client.post).toHaveBeenCalledWith(
        '/api/v1/systemadmin/sqs/queues/test-queue/dlq/replay/message-1'
      )
    })

    test('Should post to the single message dlq replay endpoint for the cads-bridge client', async () => {
      client.post.mockResolvedValue({
        queue: 'CadsBridge',
        moved: 1,
        failed: 0,
        errors: [],
        messageId: 'message-2'
      })

      await replayDLQMessage(request, 'cads-bridge', 'test-queue', 'message-2')

      expect(createApiClient).toHaveBeenCalledWith(
        request,
        'https://bridge.example'
      )
      expect(client.post).toHaveBeenCalledWith(
        '/api/v1/systemadmin/sqs/queues/test-queue/dlq/replay/message-2'
      )
    })

    test('Should wrap errors in a Boom bad request', async () => {
      client.post.mockRejectedValue(new Error('Replay failed'))

      await expect(
        replayDLQMessage(request, 'cads-cds', 'test-queue', 'message-1')
      ).rejects.toMatchObject({
        isBoom: true,
        output: { statusCode: statusCodes.badRequest }
      })
    })
  })
})
