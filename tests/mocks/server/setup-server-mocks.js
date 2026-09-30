import { vi } from 'vitest'

vi.mock('@hapi/catbox-redis', async () => {
  const CatboxMemory = await import('@hapi/catbox-memory')
  return CatboxMemory
})
