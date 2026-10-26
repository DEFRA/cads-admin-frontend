import * as animalService from './services/animalService.js'
import { getPaginationParams } from '../../common/helpers/pagination.js'

const animalsOnHoldingPageTitle = 'Animals on Holding'

const sortableColumns = [
  'Identifier',
  'BirthDate',
  'DateOnCPH',
  'Sex',
  'BreedCode'
]

export const animalsOnHoldingController = {
  async list(request, h) {
    const {
      cph,
      breedCode,
      sex: requestedSex,
      page: requestedPage,
      orderBy: requestedOrderBy,
      sortDirection: requestedSortDirection
    } = request.query
    const sex = ['Female', 'Male'].includes(requestedSex)
      ? requestedSex
      : undefined
    const filters = {
      ...(cph ? { cph } : {}),
      ...(breedCode ? { breedCode } : {}),
      ...(sex ? { sex } : {})
    }
    const page = Math.max(1, Number.parseInt(requestedPage, 10) || 1)
    const pageSize = 10
    const orderBy = sortableColumns.includes(requestedOrderBy)
      ? requestedOrderBy
      : 'Identifier'
    const sortDirection = ['Asc', 'Desc'].includes(requestedSortDirection)
      ? requestedSortDirection
      : 'Desc'
    const holdingResponse = cph
      ? await animalService.getAnimalsOnHolding(
          request,
          filters,
          { page, pageSize },
          { orderBy, sortDirection }
        )
      : null
    const holding = Array.isArray(holdingResponse)
      ? holdingResponse[0]
      : holdingResponse

    const isDefaultSort = orderBy === 'Identifier' && sortDirection === 'Desc'
    const pagination = getPaginationParams(
      holding?.totalRecords ?? 0,
      pageSize,
      page,
      filters,
      isDefaultSort ? {} : { orderBy, sortDirection }
    )

    const sortUrl = (column) => {
      const direction =
        column === orderBy && sortDirection === 'Desc' ? 'Asc' : 'Desc'
      return `?${new URLSearchParams({
        ...filters,
        orderBy: column,
        sortDirection: direction
      })}`
    }

    const animalsWithDetailUrls = (holding?.animals || []).map((animal) => ({
      ...animal,
      detailUrl: animal.identifier?.identifier
        ? `/dashboard/data/animals-on-holding/${encodeURIComponent(animal.identifier.identifier)}`
        : null
    }))

    return h.view('data/animals-on-holding/index', {
      pageTitle: animalsOnHoldingPageTitle,
      heading: animalsOnHoldingPageTitle,
      breadcrumbs: [
        { text: 'Dashboard', href: '/dashboard' },
        { text: 'Data Dashboard', href: '/dashboard/data' },
        { text: animalsOnHoldingPageTitle }
      ],
      viewModel: {
        cph,
        breedCode: breedCode ?? '',
        sex: sex ?? '',
        page,
        sort: { orderBy, sortDirection },
        sortLinks: Object.fromEntries(
          sortableColumns.map((column) => [column, sortUrl(column)])
        ),
        pagination,
        holding,
        animals: animalsWithDetailUrls
      }
    })
  },

  async details(request, h) {
    const { identifier } = request.params
    const details = await animalService.getAnimalDetails(request, identifier)
    const animal = details.animalDetail || {}

    return h.view('data/animals-on-holding/details', {
      pageTitle: 'Animal Details',
      heading:
        'Animal Details - ' + (animal.identifier?.identifier || identifier),
      breadcrumbs: [
        { text: 'Dashboard', href: '/dashboard' },
        { text: 'Data Dashboard', href: '/dashboard/data' },
        {
          text: animalsOnHoldingPageTitle,
          href: '/dashboard/data/animals-on-holding'
        },
        {
          text:
            'Animal Details - ' + (animal.identifier?.identifier || identifier)
        }
      ],
      viewModel: {
        details,
        animal
      }
    })
  }
}
