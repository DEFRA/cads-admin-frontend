import { getPaginationParams } from './pagination.js'

const pageSize = 10

function pageNumbers(items) {
  return items.map((item) => (item.ellipsis ? '…' : item.number))
}

describe('#getPaginationParams', () => {
  test('Should return a single current item and no navigation when there is one page', () => {
    const result = getPaginationParams(5, pageSize, 1, {})

    expect(result).toEqual({
      items: [{ number: 1, href: '#', current: true }],
      next: null,
      previous: null
    })
  })

  test('Should return a single current item when there are no results', () => {
    const result = getPaginationParams(0, pageSize, 1, {})

    expect(result).toEqual({
      items: [{ number: 1, href: '#', current: true }],
      next: null,
      previous: null
    })
  })

  describe('with 100 total pages', () => {
    const totalResults = 1000

    test.each([
      [1, [1, 2, '…', 100]],
      [2, [1, 2, 3, '…', 100]],
      [3, [1, 2, 3, 4, '…', 100]],
      [4, [1, 2, 3, 4, 5, '…', 100]],
      [5, [1, '…', 4, 5, 6, '…', 100]],
      [98, [1, '…', 97, 98, 99, 100]],
      [99, [1, '…', 98, 99, 100]],
      [100, [1, '…', 99, 100]]
    ])(
      'Should build the expected items for page %i',
      (currentPage, expected) => {
        const result = getPaginationParams(
          totalResults,
          pageSize,
          currentPage,
          {}
        )

        expect(pageNumbers(result.items)).toEqual(expected)
      }
    )

    test('Should mark the current page item and not set hrefs on ellipsis items', () => {
      const result = getPaginationParams(totalResults, pageSize, 5, {})

      expect(result.items).toEqual([
        { number: 1, href: '?page=1', current: false },
        { ellipsis: true },
        { number: 4, href: '?page=4', current: false },
        { number: 5, href: '?page=5', current: true },
        { number: 6, href: '?page=6', current: false },
        { ellipsis: true },
        { number: 100, href: '?page=100', current: false }
      ])
    })

    test('Should have no previous link on the first page', () => {
      const result = getPaginationParams(totalResults, pageSize, 1, {})

      expect(result.previous).toBeNull()
      expect(result.next).toEqual({ href: '?page=2' })
    })

    test('Should have no next link on the last page', () => {
      const result = getPaginationParams(totalResults, pageSize, 100, {})

      expect(result.next).toBeNull()
      expect(result.previous).toEqual({ href: '?page=99' })
    })

    test('Should have both previous and next links on a middle page', () => {
      const result = getPaginationParams(totalResults, pageSize, 50, {})

      expect(result.previous).toEqual({ href: '?page=49' })
      expect(result.next).toEqual({ href: '?page=51' })
    })
  })

  test('Should preserve query params in every generated href', () => {
    const result = getPaginationParams(25, pageSize, 2, { cph: '12/34/56' })

    expect(result.previous).toEqual({
      href: '?cph=12%2F34%2F56&page=1'
    })
    expect(result.next).toEqual({
      href: '?cph=12%2F34%2F56&page=3'
    })
    expect(result.items).toEqual([
      { number: 1, href: '?cph=12%2F34%2F56&page=1', current: false },
      { number: 2, href: '?cph=12%2F34%2F56&page=2', current: true },
      { number: 3, href: '?cph=12%2F34%2F56&page=3', current: false }
    ])
  })

  test('Should append extraParams after the page param in every generated href', () => {
    const result = getPaginationParams(
      25,
      pageSize,
      2,
      { cph: '12/34/56' },
      { orderBy: 'BirthDate', sortDirection: 'Asc' }
    )

    expect(result.previous).toEqual({
      href: '?cph=12%2F34%2F56&page=1&orderBy=BirthDate&sortDirection=Asc'
    })
    expect(result.next).toEqual({
      href: '?cph=12%2F34%2F56&page=3&orderBy=BirthDate&sortDirection=Asc'
    })
    expect(result.items[0]).toEqual({
      number: 1,
      href: '?cph=12%2F34%2F56&page=1&orderBy=BirthDate&sortDirection=Asc',
      current: false
    })
  })

  test('Should round the total pages up when results do not divide evenly by page size', () => {
    const result = getPaginationParams(21, pageSize, 1, {})

    expect(pageNumbers(result.items)).toEqual([1, 2, 3])
    expect(result.next).toEqual({ href: '?page=2' })
  })
})
