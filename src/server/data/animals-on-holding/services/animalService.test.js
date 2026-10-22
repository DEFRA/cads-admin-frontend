import { createApiClient } from '../../../common/clients/api-client.js'
import { getAnimalsOnHolding, getAnimalDetails } from './animalService.js'

vi.mock('../../../common/clients/api-client.js', () => ({
  createApiClient: vi.fn()
}))

vi.mock('../../../../config/config.js', () => ({
  getConfig: () => ({
    get: (key) => (key === 'cadsCdsBackendUrl' ? 'https://cds.example' : null)
  })
}))

describe('#getAnimalsOnHolding', () => {
  const request = {}
  const client = { get: vi.fn() }

  beforeEach(() => {
    createApiClient.mockReturnValue(client)
  })

  test('Should encode query parameters and omit empty values', async () => {
    client.get.mockResolvedValue({ result: [] })

    await expect(
      getAnimalsOnHolding(
        request,
        { cph: '12/34 & 56', unused: undefined },
        { pageSize: 10, page: 1 },
        { sortDirection: 'Desc' }
      )
    ).resolves.toEqual([])

    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/bovine/animals?cph=12%2F34+%26+56&pageSize=10&page=1&sortDirection=Desc'
    )
  })

  test('Should omit the query string when no parameters are provided', async () => {
    client.get.mockResolvedValue({ result: [] })

    await getAnimalsOnHolding(request, {}, {}, {})

    expect(client.get).toHaveBeenCalledWith('/api/v1/bovine/animals')
  })

  test('Should return animal details from the details endpoint', async () => {
    const details = {
      identifier: { schema: 'Animal', identifier: 'A123' },
      animalDetail: { species: 'Cattle' }
    }
    client.get.mockResolvedValue({ result: details })

    await expect(getAnimalDetails(request, 'A123')).resolves.toEqual(details)

    expect(client.get).toHaveBeenCalledWith('/api/v1/bovine/animals/A123')
  })
})
