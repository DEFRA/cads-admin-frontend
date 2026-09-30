/* eslint-disable import-x/first */
import { vi } from 'vitest'
import dotenv from 'dotenv'

// Load test environment variables
dotenv.config({ path: '.env.test' })

// 2. Force-load your config AFTER dotenv
import '../../src/config/config.js'

// Silence noisy logs during tests
vi.spyOn(console, 'error').mockImplementation(() => {})
vi.spyOn(console, 'warn').mockImplementation(() => {})

// Set test environment variables
process.env.NODE_ENV = 'test'
process.env.API_BASE_URL = 'http://localhost:3000'

// OIDC authentication
process.env.OIDC_WELL_KNOWN_URL =
  'http://localhost:5557/.well-known/openid-configuration'
process.env.OIDC_CLIENT_ID = 'test-client'
process.env.OIDC_CLIENT_SECRET = 'test-secret'
process.env.OIDC_REDIRECT_PATH = '/auth/callback'
process.env.OIDC_POST_LOGOUT_REDIRECT_PATH = '/auth/signed-out'
process.env.OIDC_ALLOWED_REDIRECT_ORIGINS = 'http://localhost:3000'
process.env.OIDC_POST_LOGIN_REDIRECT_URI = '/dashboard'

// Resource: CADS CDS
process.env.AZURE_CLIENT_CADS_CDS_ID = 'test-cads-cds'
process.env.USE_SIMPLE_SCOPES = true

// Session configuration
process.env.SESSION_CACHE_ENGINE = 'memory'
process.env.SESSION_COOKIE_PASSWORD = 'test-password'

// Redis configuration (not used in tests, but required by config schema)
process.env.REDIS_HOST = 'localhost'
process.env.REDIS_PORT = 6379
process.env.REDIS_USERNAME = 'default'
process.env.REDIS_PASSWORD = 'test'
process.env.REDIS_KEY_PREFIX = 'test'
process.env.USE_SINGLE_INSTANCE_CACHE = true
