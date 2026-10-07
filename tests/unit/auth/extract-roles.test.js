import { describe, it, expect } from 'vitest'
import {
  extractRoles,
  hasRole
} from '../../../src/auth/helpers/extract-roles.js'

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

describe('hasRole', () => {
  const request = (roles) => ({ auth: { credentials: { user: { roles } } } })

  it('returns true when the user has the role', () => {
    expect(
      hasRole(request(['a', 'cads-admin-superuser']), 'cads-admin-superuser')
    ).toBe(true)
  })

  it('returns false when the user does not have the role', () => {
    expect(hasRole(request(['a']), 'cads-admin-superuser')).toBe(false)
  })

  it('returns false without credentials or roles', () => {
    expect(hasRole({ auth: { credentials: null } }, 'a')).toBe(false)
    expect(hasRole({ auth: { credentials: { user: {} } } }, 'a')).toBe(false)
    expect(hasRole(undefined, 'a')).toBe(false)
  })
})
