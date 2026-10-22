import { createApiClient } from '../api-client.js'
import { executeDbAdminCommand } from './db-admin-execute-command.js'

vi.mock('../api-client.js', () => ({
  createApiClient: vi.fn()
}))

vi.mock('../../../../config/config.js', () => ({
  getConfig: () => ({
    get: (key) => (key === 'cadsCdsBackendUrl' ? 'https://cds.example' : null)
  })
}))

describe('#executeDbAdminCommand', () => {
  const request = {}
  const client = { post: vi.fn() }

  beforeEach(() => {
    createApiClient.mockReturnValue(client)
  })

  test('Should post a command without args to the CDS execute command endpoint', async () => {
    client.post.mockResolvedValue({
      command: 'sessions_by_state',
      result: [{ state: 'active', sessions: 3 }]
    })

    await expect(
      executeDbAdminCommand(request, 'sessions_by_state')
    ).resolves.toEqual({
      command: 'sessions_by_state',
      result: [{ state: 'active', sessions: 3 }]
    })

    expect(createApiClient).toHaveBeenCalledWith(request, 'https://cds.example')
    expect(client.post).toHaveBeenCalledWith(
      '/api/v1/systemadmin/db-admin-execute-command',
      { command: 'sessions_by_state' }
    )
  })

  test('Should post the args for a command that needs a process ID', async () => {
    client.post.mockResolvedValue({ command: 'cancel_query', result: true })

    await executeDbAdminCommand(request, 'cancel_query', { pid: 12345 })

    expect(client.post).toHaveBeenCalledWith(
      '/api/v1/systemadmin/db-admin-execute-command',
      { command: 'cancel_query', args: { pid: 12345 } }
    )
  })

  test('Should pass API errors to the caller', async () => {
    const error = new Error('Backend error: 403 Forbidden')
    client.post.mockRejectedValue(error)

    await expect(executeDbAdminCommand(request, 'transactions')).rejects.toBe(
      error
    )
  })
})
