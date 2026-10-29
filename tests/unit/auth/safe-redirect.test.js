import { describe, it, expect } from 'vitest'
import { getSafeRedirectPath } from '../../../src/auth/helpers/safe-redirect.js'

describe('getSafeRedirectPath', () => {
  it('returns same-site absolute paths unchanged', () => {
    expect(getSafeRedirectPath('/dashboard')).toBe('/dashboard')
    expect(getSafeRedirectPath('/report/holding_summary?page=2')).toBe(
      '/report/holding_summary?page=2'
    )
  })

  it('rejects absolute URLs and returns the fallback', () => {
    expect(getSafeRedirectPath('https://evil.example/steal', '/')).toBe('/')
  })

  it('rejects protocol-relative URLs and returns the fallback', () => {
    expect(getSafeRedirectPath('//evil.example', '/home')).toBe('/home')
  })

  it('returns the fallback for non-string or empty values', () => {
    expect(getSafeRedirectPath(undefined, null)).toBeNull()
    expect(getSafeRedirectPath('', null)).toBeNull()
    expect(getSafeRedirectPath(42, '/')).toBe('/')
  })

  it('defaults the fallback to "/"', () => {
    expect(getSafeRedirectPath('not-a-path')).toBe('/')
  })
})
