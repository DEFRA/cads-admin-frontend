import { describe, it, expect, vi, beforeEach } from 'vitest'
import Boom from '@hapi/boom'
import { createApiClient } from '../../../../src/server/common/clients/api-client.js'
import { listQueues } from '../../../../src/server/common/clients/requests/sqs-admin.js'

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
      adminEnabled: false,
      queues: []
    })

    expect(cadsBridgeResult).toEqual({
      name: 'CADS Bridge',
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
      adminEnabled: false,
      queues: []
    })
    expect(cadsBridgeResult).toEqual({
      name: 'CADS Bridge',
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
})
