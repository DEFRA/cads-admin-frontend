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

/**
 * @typedef {Object} SessionData
 * @property {import('openid-client').TokenSet} tokenSet
 * @property {Record<string, any>} user
 */

/**
 * @param {string} sessionId
 * @param {SessionData} data
 */
export async function setSession(sessionId, data) {
  const redis = getRedisClient()
  await redis.set(sessionId, JSON.stringify(data))
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
