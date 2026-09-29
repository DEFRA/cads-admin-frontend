import { defineConfig, configDefaults } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  test: {
    globals: true,
    environment: 'node',
    clearMocks: true,
    mockReset: true,
    setupFiles: ['tests/setup/vitest.setup.js'],
    include: ['tests/**/*.{test,spec}.{js,ts}', 'src/**/*.{test,spec}.{js,ts}'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'lcov'],
      include: ['src/**'],
      exclude: [
        ...configDefaults.exclude,
        '**/*.test.*',
        '**/*.spec.*',
        '.public',
        'coverage',
        'postcss.config.js',
        'stylelint.config.js',
        '**/*.md',
        '**/*.njk',
        '**/test.csv'
      ]
    }
  }
})
