/* eslint-disable import-x/first */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRedisSet = vi.fn()
const mockRedisGet = vi.fn()
const mockRedisDel = vi.fn()

vi.mock('../../../src/server/common/helpers/redis-client.js', () => ({
  buildRedisClient: vi.fn(() => ({
    set: mockRedisSet,
    get: mockRedisGet,
    del: mockRedisDel
  }))
}))

vi.mock('../../../src/config/config.js', () => ({
  getConfig: vi.fn(() => ({
    get: () => ({})
  }))
}))

// Import module under test AFTER mocks
import {
  setSession,
  getSession,
  dropSession
} from '../../../src/auth/session-store.js'

describe('session-store', () => {
  beforeEach(() => {
    mockRedisSet.mockReset()
    mockRedisGet.mockReset()
    mockRedisDel.mockReset()
  })

  it('setSession stores JSON in redis', async () => {
    mockRedisSet.mockResolvedValue('OK')

    await setSession('12345', { name: 'John Doe' })

    expect(mockRedisSet).toHaveBeenCalledWith(
      '12345',
      JSON.stringify({ name: 'John Doe' })
    )
  })

  it('getSession returns parsed JSON when found', async () => {
    mockRedisGet.mockResolvedValue(
      JSON.stringify({ user: { name: 'John Doe' } })
    )

    const session = await getSession('12345')

    expect(session).toEqual({ user: { name: 'John Doe' } })
  })

  it('getSession returns null when redis returns null', async () => {
    mockRedisGet.mockResolvedValue(null)

    const session = await getSession('99999')

    expect(session).toBeNull()
  })

  it('dropSession deletes the key', async () => {
    mockRedisDel.mockResolvedValue(1)

    await dropSession('12345')

    expect(mockRedisDel).toHaveBeenCalledWith('12345')
  })
})
