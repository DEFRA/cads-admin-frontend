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
    get: (key) => (key === 'session.cache.ttl' ? 14400000 : {})
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

  it('setSession stores JSON in redis with the configured TTL', async () => {
    mockRedisSet.mockResolvedValue('OK')

    await setSession('12345', { name: 'John Doe' })

    expect(mockRedisSet).toHaveBeenCalledWith(
      '12345',
      JSON.stringify({ name: 'John Doe' }),
      'PX',
      14400000
    )
  })

  it('setSession uses an explicit TTL when given', async () => {
    mockRedisSet.mockResolvedValue('OK')

    await setSession('12345', { a: 1 }, 600000)

    expect(mockRedisSet).toHaveBeenCalledWith(
      '12345',
      JSON.stringify({ a: 1 }),
      'PX',
      600000
    )
  })

  it.each([0, -1, 1.5, NaN, '5'])(
    'setSession rejects invalid TTL %s and writes nothing',
    async (ttl) => {
      await expect(setSession('12345', {}, ttl)).rejects.toThrow(
        'Invalid session TTL'
      )
      expect(mockRedisSet).not.toHaveBeenCalled()
    }
  )

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
