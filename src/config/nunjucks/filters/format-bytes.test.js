import { formatBytes } from './format-bytes.js'

describe('#formatBytes', () => {
  test.each([
    [0, '0 bytes'],
    [1, '1 byte'],
    [512, '512 bytes'],
    [1024, '1 KB'],
    [1536, '1.5 KB'],
    [5 * 1024 * 1024, '5 MB'],
    [3.25 * 1024 * 1024 * 1024, '3.3 GB'],
    ['2048', '2 KB']
  ])('Should format %s as %s', (value, expected) => {
    expect(formatBytes(value)).toBe(expected)
  })

  test.each([undefined, null, 'abc', -1])(
    'Should return an empty string for %s',
    (value) => {
      expect(formatBytes(value)).toBe('')
    }
  )
})
