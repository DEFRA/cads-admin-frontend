import convict from 'convict'
import { describe, expect, test } from 'vitest'
import { buildSessionSchema } from '../../../src/config/schema/session.js'

const load = (isProduction, env) => {
  const c = convict(buildSessionSchema({ isProduction }), { env })
  c.validate({ allowed: 'strict' })
  return c
}

describe('session cookie password', () => {
  test('required in production', () => {
    expect(() => load(true, {})).toThrow(/SESSION_COOKIE_PASSWORD/)
  })
  test('rejects short value in production', () => {
    expect(() => load(true, { SESSION_COOKIE_PASSWORD: 'short' })).toThrow()
  })
  test('rejects dev default in production', () => {
    expect(() =>
      load(true, {
        SESSION_COOKIE_PASSWORD:
          'the-password-must-be-at-least-32-characters-long'
      })
    ).toThrow(/development default/)
  })
  test('accepts a good value in production', () => {
    expect(() =>
      load(true, { SESSION_COOKIE_PASSWORD: 'x'.repeat(40) })
    ).not.toThrow()
  })
  test('non-production uses the dev default', () => {
    expect(() => load(false, {})).not.toThrow()
  })
})
