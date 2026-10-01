import { describe, it, expect } from 'vitest'
import { extractRoles } from '../../../src/auth/helpers/extract-roles.js'

describe('extractRoles', () => {
  it('returns the Azure roles array', () => {
    expect(extractRoles({ roles: ['a', 'b'] })).toEqual(['a', 'b'])
  })

  it('wraps the mock single role string', () => {
    expect(extractRoles({ role: 'cads-admin-superuser' })).toEqual([
      'cads-admin-superuser'
    ])
  })

  it('accepts an array in the mock role claim', () => {
    expect(extractRoles({ role: ['a', 'b'] })).toEqual(['a', 'b'])
  })

  it('prefers roles over role', () => {
    expect(extractRoles({ roles: ['a'], role: 'b' })).toEqual(['a'])
  })

  it('returns an empty array when there are no roles', () => {
    expect(extractRoles({})).toEqual([])
    expect(extractRoles(undefined)).toEqual([])
  })
})
