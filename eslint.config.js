import neostandard from 'neostandard'
import vitest from '@vitest/eslint-plugin'
import prettier from 'eslint-plugin-prettier'
import packageJson from 'eslint-plugin-package-json'
import globals from 'globals'

const customIgnores = [
  '.server',
  '.public',
  'src/__fixtures__',
  'coverage',
  '.husky',
  '.github',
  'node_modules',
  '.sonarlint',
  'raw-assets',
  '.prettierrc.js',
  '.vite/setup-files.js',
  '*.config.*',
  'vite.config.*',
  'vitest.config.*'
]

export default [
  ...neostandard({
    env: ['node', 'vitest'],
    ignores: [...neostandard.resolveIgnoresFromGitignore(), ...customIgnores],
    noJsx: true,
    noStyle: true
  }),
  {
    files: ['**/*.js'],
    languageOptions: { sourceType: 'module' }
  },
  {
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs' }
  },
  {
    files: ['src/client/**/*.js'],
    languageOptions: {
      globals: { ...globals.browser }
    }
  },
  {
    files: [
      '.vite/**/*.js',
      '**/*.test.{js,cjs}',
      '**/__mocks__/**',
      '**/__fixtures__/**',
      'vitest.config.js',
      'test-helpers/**'
    ],
    plugins: { vitest },
    languageOptions: {
      globals: { ...vitest.environments.env.globals }
    },
    rules: {
      ...vitest.configs.recommended.rules
    }
  },
  {
    ...packageJson.configs.recommended,
    rules: {
      ...packageJson.configs.recommended.rules,
      'package-json/restrict-dependency-ranges': [
        'error',
        {
          forDependencyTypes: ['dependencies', 'devDependencies'],
          rangeType: 'pin'
        }
      ]
    }
  },
  {
    plugins: { prettier },
    rules: {
      'prettier/prettier': ['error', { endOfLine: 'auto' }]
    }
  }
]
