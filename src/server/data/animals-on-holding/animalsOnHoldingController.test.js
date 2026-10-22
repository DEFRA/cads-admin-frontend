import { createServer } from '../../server.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import * as animalService from './services/animalService.js'

vi.mock('../../../auth/auth-required.js', () => ({
  authRequired: vi.fn((_req, h) => h.continue)
}))

vi.mock('./services/animalService.js', () => ({
  getAnimalsOnHolding: vi.fn(),
  getAnimalDetails: vi.fn()
}))

describe('#animalsOnHoldingController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET animals on holding pages', () => {
    test('Should render the holdings list for the supplied CPH', async () => {
      animalService.getAnimalsOnHolding.mockResolvedValue([
        {
          CPH: { schema: 'CPH', identifier: '12/34/56' },
          LocationName: 'Meadow Farm',
          animals: [{ identifier: { identifier: 'A123' } }]
        }
      ])

      const response = await server.inject({
        method: 'GET',
        url: '/dashboard/data/animals-on-holding?cph=12%2F34%2F56'
      })

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.result).toContain('Meadow Farm')
      expect(response.result).toContain('12/34/56')
      expect(response.result).toContain('name="cph"')
      expect(response.result).toContain('required')
      expect(response.result).toContain('value="12/34/56"')
      expect(response.result).toContain(
        '/dashboard/data/animals-on-holding/A123'
      )
      expect(animalService.getAnimalsOnHolding).toHaveBeenCalledWith(
        expect.anything(),
        { cph: '12/34/56' },
        { page: 1, pageSize: 10 },
        { orderBy: 'Identifier', sortDirection: 'Desc' }
      )
    })

    test('Should not fetch holdings when no CPH is supplied', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/dashboard/data/animals-on-holding'
      })

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.result).toContain('data-testid="no-holdings"')
      expect(response.result).not.toContain('value="1234"')
      expect(response.result).not.toContain('cph=undefined')
      expect(animalService.getAnimalsOnHolding).not.toHaveBeenCalled()
    })

    test('Should use the supplied CPH', async () => {
      animalService.getAnimalsOnHolding.mockResolvedValue([])

      const response = await server.inject({
        method: 'GET',
        url: '/dashboard/data/animals-on-holding?cph=12%2F34%2F56'
      })

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.result).toContain('value="12/34/56"')
      expect(animalService.getAnimalsOnHolding).toHaveBeenCalledWith(
        expect.anything(),
        { cph: '12/34/56' },
        { page: 1, pageSize: 10 },
        { orderBy: 'Identifier', sortDirection: 'Desc' }
      )
    })

    test('Should render pagination links and request the supplied page', async () => {
      animalService.getAnimalsOnHolding.mockResolvedValue([
        { totalRecords: 25, animals: [] }
      ])

      const response = await server.inject({
        method: 'GET',
        url: '/dashboard/data/animals-on-holding?cph=12%2F34%2F56&page=2'
      })

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.result).toContain('?cph=12%2F34%2F56&amp;page=1')
      expect(response.result).toContain('?cph=12%2F34%2F56&amp;page=3')
      expect(animalService.getAnimalsOnHolding).toHaveBeenCalledWith(
        expect.anything(),
        { cph: '12/34/56' },
        { page: 2, pageSize: 10 },
        { orderBy: 'Identifier', sortDirection: 'Desc' }
      )
    })

    test('Should sort by a supported field and toggle its direction', async () => {
      animalService.getAnimalsOnHolding.mockResolvedValue([
        {
          totalRecords: 25,
          animals: [{ identifier: { identifier: 'A123' } }]
        }
      ])

      const response = await server.inject({
        method: 'GET',
        url: '/dashboard/data/animals-on-holding?cph=12%2F34%2F56&orderBy=BirthDate&sortDirection=Asc&page=2'
      })

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.result).toContain('aria-sort="ascending"')
      expect(response.result).toContain(
        '?cph=12%2F34%2F56&amp;orderBy=BirthDate&amp;sortDirection=Desc'
      )
      expect(response.result).toContain(
        '?cph=12%2F34%2F56&amp;page=3&amp;orderBy=BirthDate&amp;sortDirection=Asc'
      )
      expect(animalService.getAnimalsOnHolding).toHaveBeenCalledWith(
        expect.anything(),
        { cph: '12/34/56' },
        { page: 2, pageSize: 10 },
        { orderBy: 'BirthDate', sortDirection: 'Asc' }
      )
    })

    test('Should apply breed and sex filters and preserve them in navigation', async () => {
      animalService.getAnimalsOnHolding.mockResolvedValue([
        {
          totalRecords: 25,
          animals: [{ identifier: { identifier: 'A123' } }]
        }
      ])

      const response = await server.inject({
        method: 'GET',
        url: '/dashboard/data/animals-on-holding?cph=12%2F34%2F56&breedCode=B01&sex=Female&page=2'
      })

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.result).toContain('name="breedCode"')
      expect(response.result).toContain('value="B01"')
      expect(response.result).toContain(
        '<option value="Female" selected>Female</option>'
      )
      expect(response.result).toContain(
        '?cph=12%2F34%2F56&amp;breedCode=B01&amp;sex=Female&amp;page=3'
      )
      expect(animalService.getAnimalsOnHolding).toHaveBeenCalledWith(
        expect.anything(),
        { cph: '12/34/56', breedCode: 'B01', sex: 'Female' },
        { page: 2, pageSize: 10 },
        { orderBy: 'Identifier', sortDirection: 'Desc' }
      )
    })

    test('Should render animal details', async () => {
      animalService.getAnimalDetails.mockResolvedValue({
        resourceType: 'AnimalDetailEvent',
        identifier: { schema: 'Animal', identifier: 'A123' },
        eventDateTime: '2025-01-12T10:30:00Z',
        source: {
          system: 'CDS',
          schema: 'animal-details',
          schemaVersion: '1'
        },
        animalDetail: {
          resourceType: 'Animal',
          identifier: { schema: 'Animal', identifier: 'A123' },
          species: 'Cattle',
          sex: 'Female',
          birthDate: '2020-02-01',
          registrationDate: '2020-02-10',
          dateOnCPH: '2025-01-12',
          currentLocation: {
            identifier: '12/34/56',
            subIdentifier: 'A',
            fullIdentifier: '12/34/56/A',
            name: 'Meadow Farm',
            premisesType: 'Farm'
          },
          registeredLocation: {
            identifier: '65/43/21',
            subIdentifier: 'B',
            fullIdentifier: '65/43/21/B',
            name: 'Hill Farm',
            premisesType: 'Farm'
          },
          deathLocation: {
            identifier: '11/22/33',
            fullIdentifier: '11/22/33',
            name: 'Valley Farm',
            premisesType: 'Farm'
          },
          breedCode: { identifier: 'B01', breedName: 'Hereford' },
          parentage: {
            relationship: 'dam',
            animalIdentifier: { identifier: 'D123' }
          },
          state: 'alive',
          restrictionStatus: 'none'
        }
      })

      const response = await server.inject({
        method: 'GET',
        url: '/dashboard/data/animals-on-holding/A123'
      })

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.result).toContain('A123')
      expect(response.result).toContain('Hereford')
      expect(response.result).toContain('2025-01-12')
      expect(response.result).toContain('CDS')
      expect(response.result).toContain('dam')
      expect(response.result).toContain('Identifier: 12/34/56')
      expect(response.result).toContain('Sub-identifier: A')
      expect(response.result).toContain('Full identifier: 12/34/56/A')
      expect(response.result).toContain('Name: Meadow Farm')
      expect(response.result).toContain('Premises type: Farm')
      expect(response.result).toContain('Identifier: 65/43/21')
      expect(response.result).toContain('Identifier: 11/22/33')
      expect(response.result).toContain('Sub-identifier: Not available')
      expect(response.result).not.toContain('{"identifier":"12/34/56"}')
      expect(animalService.getAnimalDetails).toHaveBeenCalledWith(
        expect.anything(),
        'A123'
      )
    })
  })
})
