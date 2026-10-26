export function getPaginationParams(
  totalResults,
  pageSize,
  currentPage,
  queryParams,
  extraParams = {}
) {
  const totalPages = Math.ceil(totalResults / pageSize)
  let previous = null
  let next = null

  if (totalPages < 2) {
    return {
      items: [
        {
          number: 1,
          href: '#',
          current: true
        }
      ],
      next: null,
      previous: null
    }
  }

  if (currentPage > 1) {
    previous = {
      href: getPageUrl(queryParams, currentPage - 1, extraParams)
    }
  }
  if (currentPage < totalPages) {
    next = {
      href: getPageUrl(queryParams, currentPage + 1, extraParams)
    }
  }

  const items = buildPaginationItems(
    currentPage,
    totalPages,
    queryParams,
    extraParams
  )

  return {
    items,
    next,
    previous
  }
}

function buildPaginationItems(
  currentPage,
  totalPages,
  queryParams,
  extraParams
) {
  const keptPages = Array.from(
    new Set(
      [1, totalPages, currentPage - 1, currentPage, currentPage + 1].filter(
        (page) => page >= 1 && page <= totalPages
      )
    )
  ).sort((a, b) => a - b)

  const items = []
  keptPages.forEach((page, index) => {
    if (index > 0) {
      const previousKeptPage = keptPages[index - 1]
      const gap = page - previousKeptPage
      if (gap === 2) {
        items.push(
          buildPageItem(
            previousKeptPage + 1,
            currentPage,
            queryParams,
            extraParams
          )
        )
      } else if (gap > 2) {
        items.push({ ellipsis: true })
      }
    }
    items.push(buildPageItem(page, currentPage, queryParams, extraParams))
  })

  return items
}

function buildPageItem(page, currentPage, queryParams, extraParams) {
  return {
    number: page,
    href: getPageUrl(queryParams, page, extraParams),
    current: page === currentPage
  }
}

function getPageUrl(queryParams, targetPage, extraParams = {}) {
  return `?${new URLSearchParams({
    ...queryParams,
    page: String(targetPage),
    ...extraParams
  })}`
}
