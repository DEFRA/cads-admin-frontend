import { describe, it, expect } from 'vitest'

// Import module under test AFTER mocks
import { hasPermission } from '../../../src/auth/permission-helper.js'

describe('hasPermission', () => {
  it('given key is null returns false', () => {
    const result = hasPermission(['REPORT_VIEW'], null)
    expect(result).toBeFalsy()
  })

  it('given permissions is null returns false', () => {
    const result = hasPermission(null, 'REPORT_VIEW')
    expect(result).toBeFalsy()
  })

  it('given permissions is empty returns false', () => {
    const result = hasPermission([], 'REPORT_VIEW')
    expect(result).toBeFalsy()
  })

  it('given permissions exist when checking non-matching record returns false', () => {
    const reportPermissions = {
      reportKey: 'holding_summary',
      permissions: ['REPORT_VIEW']
    }

    const result = hasPermission(reportPermissions.permissions, 'REPORT_EXPORT')
    expect(result).toBeFalsy()
  })

  it('given permissions exist when checking matching record returns true', () => {
    const reportPermissions = {
      reportKey: 'holding_summary',
      permissions: ['REPORT_VIEW', 'REPORT_EXPORT']
    }

    const result = hasPermission(reportPermissions.permissions, 'REPORT_EXPORT')
    expect(result).toBeTruthy()
  })
})
