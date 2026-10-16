import { describe, it, expect, vi, beforeEach } from 'vitest'
import Boom from '@hapi/boom'
import { createApiClient } from '../../../../src/server/common/clients/api-client.js'
import {
  listQueues,
  getQueueMetrics
} from '../../../../src/server/common/clients/requests/sqs-admin.js'

vi.mock('../../../../src/server/common/clients/api-client.js', () => ({
  createApiClient: vi.fn()
}))

vi.mock('../../../../src/config/config.js', () => ({
  getConfig: () => ({
    get: (key) => {
      const map = {
        cadsCdsBackendUrl: 'https://cds.example',
        cadsBridgeBackendUrl: 'https://bridge.example'
      }
      return map[key]
    }
  })
}))

describe('#sqs-admin requests', () => {
  const request = {}
  let cdsClient
  let bridgeClient

  beforeEach(() => {
    cdsClient = { get: vi.fn() }
    bridgeClient = { get: vi.fn() }

    createApiClient.mockImplementation((_, backendUrl) =>
      backendUrl === 'https://cds.example' ? cdsClient : bridgeClient
    )
  })

  it('Should mark CDS as admin disabled when it returns a 404', async () => {
    cdsClient.get.mockRejectedValue(Boom.notFound())
    bridgeClient.get.mockResolvedValue({
      queues: [
        {
          name: 'queue-1',
          queueUrl: 'https://sqs.example/queue-1',
          dlqQueueUrl: 'https://sqs.example/queue-1-dlq'
        }
      ]
    })

    const [cadsCdsResult, cadsBridgeResult] = await listQueues(request)

    expect(cadsCdsResult).toEqual({
      name: 'CADS Data Service',
      slug: 'cads-cds',
      adminEnabled: false,
      queues: []
    })

    expect(cadsBridgeResult).toEqual({
      name: 'CADS Bridge',
      slug: 'cads-bridge',
      adminEnabled: true,
      queues: [
        {
          name: 'queue-1',
          queueName: 'queue-1',
          dlqName: 'queue-1-dlq'
        }
      ]
    })
  })

  it('Should mark CADS Bridge as admin disabled when it returns a 404', async () => {
    cdsClient.get.mockResolvedValue({ queues: [] })
    bridgeClient.get.mockRejectedValue(Boom.notFound())

    const [, cadsBridgeResult] = await listQueues(request)

    expect(cadsBridgeResult).toEqual({
      name: 'CADS Bridge',
      slug: 'cads-bridge',
      adminEnabled: false,
      queues: []
    })
  })

  it('Should mark both clients as admin disabled when both return a 404', async () => {
    cdsClient.get.mockRejectedValue(Boom.notFound())
    bridgeClient.get.mockRejectedValue(Boom.notFound())

    const [cadsCdsResult, cadsBridgeResult] = await listQueues(request)

    expect(cadsCdsResult).toEqual({
      name: 'CADS Data Service',
      slug: 'cads-cds',
      adminEnabled: false,
      queues: []
    })
    expect(cadsBridgeResult).toEqual({
      name: 'CADS Bridge',
      slug: 'cads-bridge',
      adminEnabled: false,
      queues: []
    })
  })

  it('Should rethrow non-404 errors instead of disabling admin', async () => {
    cdsClient.get.mockRejectedValue(Boom.badImplementation())
    bridgeClient.get.mockResolvedValue({ queues: [] })

    await expect(listQueues(request)).rejects.toMatchObject({
      output: { statusCode: 500 }
    })
  })

  describe('#getQueueMetrics', () => {
    it('Should fetch queue and DLQ metrics from the CDS client', async () => {
      cdsClient.get
        .mockResolvedValueOnce({ messagesAvailable: 5 })
        .mockResolvedValueOnce({ messagesAvailable: 1 })

      const [queueMetrics, dlqMetrics] = await getQueueMetrics(
        request,
        'cads-cds',
        'queue-1'
      )

      expect(cdsClient.get).toHaveBeenNthCalledWith(
        1,
        '/api/v1/systemadmin/sqs/queues/queue-1/metrics'
      )
      expect(cdsClient.get).toHaveBeenNthCalledWith(
        2,
        '/api/v1/systemadmin/sqs/queues/queue-1/dlq/metrics'
      )
      expect(bridgeClient.get).not.toHaveBeenCalled()
      expect(queueMetrics).toEqual({ messagesAvailable: 5 })
      expect(dlqMetrics).toEqual({ messagesAvailable: 1 })
    })

    it('Should fetch queue and DLQ metrics from the CADS Bridge client', async () => {
      bridgeClient.get
        .mockResolvedValueOnce({ messagesAvailable: 2 })
        .mockResolvedValueOnce({ messagesAvailable: 0 })

      const [queueMetrics, dlqMetrics] = await getQueueMetrics(
        request,
        'cads-bridge',
        'queue-2'
      )

      expect(bridgeClient.get).toHaveBeenNthCalledWith(
        1,
        '/api/v1/systemadmin/sqs/queues/queue-2/metrics'
      )
      expect(bridgeClient.get).toHaveBeenNthCalledWith(
        2,
        '/api/v1/systemadmin/sqs/queues/queue-2/dlq/metrics'
      )
      expect(cdsClient.get).not.toHaveBeenCalled()
      expect(queueMetrics).toEqual({ messagesAvailable: 2 })
      expect(dlqMetrics).toEqual({ messagesAvailable: 0 })
    })

    it('Should wrap errors from the queue metrics request in a Boom 400', async () => {
      cdsClient.get.mockRejectedValue(new Error('upstream failure'))

      await expect(
        getQueueMetrics(request, 'cads-cds', 'queue-1')
      ).rejects.toMatchObject({
        output: { statusCode: 400 },
        message: 'upstream failure'
      })
    })

    it('Should wrap errors from the DLQ metrics request in a Boom 400', async () => {
      cdsClient.get
        .mockResolvedValueOnce({ messagesAvailable: 5 })
        .mockRejectedValueOnce(new Error('dlq failure'))

      await expect(
        getQueueMetrics(request, 'cads-cds', 'queue-1')
      ).rejects.toMatchObject({
        output: { statusCode: 400 },
        message: 'dlq failure'
      })
    })
  })
})
