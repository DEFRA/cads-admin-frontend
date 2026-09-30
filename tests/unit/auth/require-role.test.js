import { describe, it, expect } from 'vitest'
import Boom from '@hapi/boom'

// Import module under test AFTER mocks
import { requireRole } from '../../../src/auth/require-role.js'

function createH() {
  return {
    continue: 'continue'
  }
}

describe('requireRole', () => {
  it('allows access when user has the required role', () => {
    const handler = requireRole('admin')

    const request = {
      auth: {
        credentials: {
          user: {
            roles: ['admin', 'editor']
          }
        }
      }
    }

    const h = createH()

    const result = handler(request, h)

    expect(result).toBe('continue')
  })

  it('throws Boom.forbidden when user does not have the required role', () => {
    const handler = requireRole('admin')

    const request = {
      auth: {
        credentials: {
          user: {
            roles: ['viewer']
          }
        }
      }
    }

    const h = createH()

    expect(() => handler(request, h)).toThrow(Boom.Boom)

    try {
      handler(request, h)
    } catch (err) {
      expect(err.output.statusCode).toBe(403)
      expect(err.message).toBe('Forbidden')
    }
  })

  it('throws Boom.forbidden when roles array is missing', () => {
    const handler = requireRole('admin')

    const request = {
      auth: {
        credentials: {
          user: {}
        }
      }
    }

    const h = createH()

    expect(() => handler(request, h)).toThrow(Boom.Boom)
  })
})
