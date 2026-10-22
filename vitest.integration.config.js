import { defineConfig } from 'vitest/config'

import baseConfig from './vitest.config.js'

// Integration tests that start the OIDC mock and Redis with testcontainers.
// Docker must be running. The arrays are replaced rather than merged, so
// only these tests run.
export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: ['tests/**/*.oidc.test.js'],
    exclude: [],
    coverage: { enabled: false },
    testTimeout: 60_000,
    hookTimeout: 300_000
  }
})
