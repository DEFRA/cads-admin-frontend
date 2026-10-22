import * as animalService from './services/animalService.js'

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
      cph,
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
    const totalPages = Math.ceil((holding?.totalRecords ?? 0) / pageSize)
    const pageUrl = (targetPage) =>
      `?${new URLSearchParams({
        ...filters,
        page: String(targetPage),
        orderBy,
        sortDirection
      })}`
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
      pageTitle: 'Animals on Holding',
      heading: 'Animals on Holding',
      breadcrumbs: [
        { text: 'Dashboard', href: '/dashboard' },
        { text: 'Data Dashboard', href: '/dashboard/data' },
        { text: 'Animals on Holding' }
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
        pagination: {
          previous: page > 1 ? { href: pageUrl(page - 1) } : undefined,
          next: page < totalPages ? { href: pageUrl(page + 1) } : undefined
        },
        holding,
        totalPages,
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
          text: 'Animals on Holding',
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
