import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

describe('CSP inline script hash', () => {
  test('matches the govuk-frontend template inline script', () => {
    const template = readFileSync(
      'node_modules/govuk-frontend/dist/govuk/template.njk',
      'utf8'
    )
    const script = template.match(
      /<script[^>]*>(document\.body[\s\S]*?)<\/script>/
    )[1]
    const hash = createHash('sha256').update(script).digest('base64')
    const csp = readFileSync(
      'src/server/common/helpers/content-security-policy.js',
      'utf8'
    )
    expect(csp).toContain(`'sha256-${hash}'`)
  })
})
