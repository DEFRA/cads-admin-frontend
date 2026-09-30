import { vi } from 'vitest'

// Basic fetch mock
const mockFetch = vi.fn()

vi.stubGlobal('fetch', mockFetch)

// Default behaviour: throw if a test forgets to mock a request
mockFetch.mockImplementation(() => {
  throw new Error('fetch called without a mock implementation')
})

// Reset between tests
beforeEach(() => {
  mockFetch.mockReset()
})
