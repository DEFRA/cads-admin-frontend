import { createApiClient } from '../api-client.js'
import { getCtsImportRuns, runCtsImportCommand } from './db-admin-cts-import.js'

vi.mock('../api-client.js', () => ({
  createApiClient: vi.fn()
}))

vi.mock('../../../../config/config.js', () => ({
  getConfig: () => ({
    get: (key) => (key === 'cadsCdsBackendUrl' ? 'https://cds.example' : null)
  })
}))

describe('#db-admin-cts-import requests', () => {
  const request = {}
  const client = { get: vi.fn(), post: vi.fn() }

  beforeEach(() => {
    createApiClient.mockReturnValue(client)
  })

  test('Should get the runs using the runs command and map them', async () => {
    client.post.mockResolvedValue({
      command: 'runs',
      result: [
        {
          run_id: 2,
          status: 'complete',
          created_at: '2026-10-01T08:00:00Z',
          bulk_completed_at: '2026-10-01T10:00:00Z',
          completed_at: '2026-10-01T11:00:00Z'
        }
      ]
    })

    await expect(getCtsImportRuns(request)).resolves.toEqual([
      {
        runId: 2,
        status: 'complete',
        createdAt: '2026-10-01T08:00:00Z',
        bulkCompletedAt: '2026-10-01T10:00:00Z',
        completedAt: '2026-10-01T11:00:00Z'
      }
    ])

    expect(createApiClient).toHaveBeenCalledWith(request, 'https://cds.example')
    expect(client.post).toHaveBeenCalledWith(
      '/api/v1/systemadmin/db-admin-cts-import',
      { command: 'runs' }
    )
  })

  test('Should return no runs when the runs command result is not a list', async () => {
    client.post.mockResolvedValue({ command: 'runs', result: {} })

    await expect(getCtsImportRuns(request)).resolves.toEqual([])
  })

  test('Should post the command and run id to the CDS cts import endpoint', async () => {
    client.post.mockResolvedValue({ command: 'plan', result: [] })

    await expect(runCtsImportCommand(request, 'plan', 7)).resolves.toEqual({
      command: 'plan',
      result: []
    })

    expect(client.post).toHaveBeenCalledWith(
      '/api/v1/systemadmin/db-admin-cts-import',
      { command: 'plan', args: { run_id: 7 } }
    )
  })
})
