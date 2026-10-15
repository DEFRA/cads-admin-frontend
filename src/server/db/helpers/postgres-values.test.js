import {
  formatDuration,
  parseInterval,
  parseSize,
  toNumber,
  toRows
} from './postgres-values.js'

describe('#toRows', () => {
  test('Should return the list of rows', () => {
    expect(toRows([{ state: 'active' }])).toEqual([{ state: 'active' }])
  })

  test.each([{}, null, undefined, true])(
    'Should treat %s as no rows',
    (result) => {
      expect(toRows(result)).toEqual([])
    }
  )
})

describe('#parseInterval', () => {
  test.each([
    ['00:00:01.5', 1.5],
    ['00:30:24', 1824],
    ['26:00:00', 93600],
    ['1 day 02:03:04', 93784],
    ['3 days', 259200],
    ['2 days 00:00:01', 172801],
    ['-00:00:02', -2],
    ['-1 days +02:00:00', -79200],
    ['2 hours 30 mins', 9000]
  ])('Should parse %s as %d seconds', (value, seconds) => {
    expect(parseInterval(value)).toBeCloseTo(seconds)
  })

  test.each([null, undefined, '', 'not an interval', 42])(
    'Should return null for %s',
    (value) => {
      expect(parseInterval(value)).toBeNull()
    }
  )
})

describe('#formatDuration', () => {
  test.each([
    [0.25, '250ms'],
    [0, '0ms'],
    [45, '45s'],
    [1824, '30m 24s'],
    [3600, '1h'],
    [93784, '1d 2h 3m 4s']
  ])('Should format %d seconds as %s', (seconds, text) => {
    expect(formatDuration(seconds)).toBe(text)
  })

  test('Should return an empty string when there is no duration', () => {
    expect(formatDuration(null)).toBe('')
  })
})

describe('#parseSize', () => {
  test.each([
    ['8192 bytes', 8192],
    ['16 kB', 16384],
    ['12 MB', 12582912],
    ['2 GB', 2147483648],
    ['1 TB', 1099511627776]
  ])('Should parse %s', (value, bytes) => {
    expect(parseSize(value)).toBe(bytes)
  })

  test.each([null, '', 'large'])('Should return null for %s', (value) => {
    expect(parseSize(value)).toBeNull()
  })
})

describe('#toNumber', () => {
  test.each([
    [12, 12],
    ['99.5', 99.5],
    [null, 0],
    ['n/a', 0]
  ])('Should convert %s to %d', (value, number) => {
    expect(toNumber(value)).toBe(number)
  })
})
