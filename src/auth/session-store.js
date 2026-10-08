import { buildRedisClient } from '../server/common/helpers/redis-client.js'
import { getConfig } from '../config/config.js'

// Dedicated Redis client for auth sessions, created once and reused
let redisClient = null

function getRedisClient() {
  if (!redisClient) {
    const config = getConfig()
    const redisConfig = config.get('redis')
    redisClient = buildRedisClient(redisConfig)
  }
  return redisClient
}

function getDefaultTtlMs() {
  return getConfig().get('session.cache.ttl')
}

/**
 * @typedef {Object} SessionData
 * @property {import('openid-client').TokenSet} tokenSet
 * @property {Record<string, any>} user
 */

/**
 * Every key written here expires. A missing or invalid TTL throws rather than
 * silently storing a key that would live in the shared Redis forever.
 *
 * @param {string} sessionId
 * @param {SessionData} data
 * @param {number} [ttlMs] Defaults to session.cache.ttl (SESSION_CACHE_TTL)
 */
export async function setSession(sessionId, data, ttlMs = getDefaultTtlMs()) {
  if (!Number.isInteger(ttlMs) || ttlMs <= 0) {
    throw new Error(`Invalid session TTL: ${ttlMs}`)
  }
  const redis = getRedisClient()
  await redis.set(sessionId, JSON.stringify(data), 'PX', ttlMs)
}

/**
 * @param {string} sessionId
 * @returns {Promise<SessionData|null>}
 */
export async function getSession(sessionId) {
  const redis = getRedisClient()
  const raw = await redis.get(sessionId)
  if (!raw) {
    return null
  }
  return JSON.parse(raw)
}

/**
 * @param {string} sessionId
 */
export async function dropSession(sessionId) {
  const redis = getRedisClient()
  await redis.del(sessionId)
}
