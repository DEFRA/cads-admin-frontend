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

  test('Should get the runs from the CDS runs endpoint', async () => {
    client.get.mockResolvedValue({ runs: [] })

    await expect(getCtsImportRuns(request)).resolves.toEqual({ runs: [] })

    expect(createApiClient).toHaveBeenCalledWith(request, 'https://cds.example')
    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/systemadmin/db-admin-cts-import/runs'
    )
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
