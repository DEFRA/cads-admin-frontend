import { getConfig } from '../../../config/config.js'

const oneHourMs = 3600000

/**
 * S3 listings page forwards with opaque continuation tokens. To offer
 * "Previous" links without putting tokens in URLs, the token for each page
 * reached is kept in the server-side cache, per user and listing.
 *
 * @param {import('@hapi/hapi').Server} server
 */
export function createPageTokenStore(server) {
  const cache = server.cache({
    cache: getConfig().get('session.cache.name'),
    segment: 's3-explorer-page-tokens',
    expiresIn: oneHourMs
  })

  const cacheKey = (request, listing) =>
    JSON.stringify([request.state?.sid?.sessionId ?? 'anonymous', ...listing])

  return {
    /**
     * @param {import('@hapi/hapi').Request} request
     * @param {Array<string | number>} listing - identifies the listing (bucket, prefix, page size)
     * @param {number} page
     * @returns {Promise<string | null | undefined>} null for page 1, undefined if the page was never reached
     */
    async get(request, listing, page) {
      if (page <= 1) {
        return null
      }
      const tokens = await cache.get(cacheKey(request, listing))
      return tokens?.[page]
    },

    async set(request, listing, page, token) {
      const key = cacheKey(request, listing)
      const tokens = (await cache.get(key)) ?? {}
      if (tokens[page] !== token) {
        await cache.set(key, { ...tokens, [page]: token })
      }
    }
  }
}
