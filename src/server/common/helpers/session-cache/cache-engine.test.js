import { vi } from 'vitest'

import { Engine as CatboxRedis } from '@hapi/catbox-redis'
import { Engine as CatboxMemory } from '@hapi/catbox-memory'

import { getCacheEngine } from './cache-engine.js'
import { getConfig } from '../../../../config/config.js'

const mockLoggerInfo = vi.fn()
const mockLoggerError = vi.fn()

vi.mock('../logging/logger.js', () => ({
  createLogger: () => ({
    info: mockLoggerInfo,
    error: mockLoggerError
  })
}))

vi.mock('ioredis', () => {
  class MockRedis {
    constructor() {
      this.on = vi.fn()
    }
  }

  class MockCluster {
    constructor() {
      this.on = vi.fn()
    }
  }

  return {
    default: MockRedis,
    Redis: MockRedis,
    Cluster: MockCluster
  }
})

vi.mock('@hapi/catbox-redis', () => ({
  Engine: vi.fn()
}))

vi.mock('@hapi/catbox-memory', () => ({
  Engine: vi.fn()
}))

describe('#getCacheEngine', () => {
  describe('When Redis cache engine has been requested', () => {
    afterEach(() => {
      getConfig().set('isProduction', false)
      vi.clearAllMocks()
    })

    beforeEach(() => {
      getCacheEngine('redis')
    })

    test('Should setup Redis cache', () => {
      expect(CatboxRedis).toHaveBeenCalledWith(expect.any(Object))
    })

    test('Should log expected Redis message', () => {
      expect(mockLoggerInfo).toHaveBeenCalledWith('Using Redis session cache')
    })
  })

  describe('When In memory cache engine has been requested', () => {
    afterEach(() => {
      getConfig().set('isProduction', false)
      vi.clearAllMocks()
    })

    beforeEach(() => {
      getCacheEngine()
    })

    test('Should setup In memory cache', () => {
      expect(CatboxMemory).toHaveBeenCalledTimes(1)
    })

    test('Should log expected CatBox memory message', () => {
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Using Catbox Memory session cache'
      )
    })
  })

  describe('When In memory cache engine has been requested in Production', () => {
    afterEach(() => {
      getConfig().set('isProduction', false)
      vi.clearAllMocks()
    })

    beforeEach(() => {
      getConfig().set('isProduction', true)
      getCacheEngine()
    })

    test('Should log Production warning message', () => {
      expect(mockLoggerError).toHaveBeenCalledWith(
        'Catbox Memory is for local development only, it should not be used in production!'
      )
    })

    test('Should setup In memory cache', () => {
      expect(CatboxMemory).toHaveBeenCalledTimes(1)
    })

    test('Should log expected message', () => {
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Using Catbox Memory session cache'
      )
    })
  })
})
