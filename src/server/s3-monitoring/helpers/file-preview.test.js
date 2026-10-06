import {
  detectFormat,
  isBinaryKey,
  looksBinary,
  maxLineChars,
  normaliseLines
} from './file-preview.js'

describe('#detectFormat', () => {
  test.each([
    ['imports/CTSM_APP_ENV_TYPE_1_TABLE_2024-01-01-120000.csv', 'csv'],
    ['data/file.TSV', 'tsv'],
    ['events.ndjson', 'json'],
    ['config.json', 'json'],
    ['feed.xml', 'xml'],
    ['notes.txt', 'plain'],
    ['folder.v2/README', 'plain'],
    ['.hidden', 'plain']
  ])('Should detect %s as %s', (key, format) => {
    expect(detectFormat(key)).toBe(format)
  })
})

describe('#isBinaryKey', () => {
  test.each(['a/b.zip', 'report.PDF', 'data.parquet', 'x.tar.gz'])(
    'Should treat %s as binary',
    (key) => {
      expect(isBinaryKey(key)).toBe(true)
    }
  )

  test.each(['a.csv', 'b.json', 'README'])(
    'Should not treat %s as binary',
    (key) => {
      expect(isBinaryKey(key)).toBe(false)
    }
  )
})

describe('#looksBinary', () => {
  const replacementChar = String.fromCodePoint(0xfffd)

  test('Should detect NUL characters', () => {
    expect(looksBinary(['abc\u0000def'])).toBe(true)
  })

  test('Should detect a high share of replacement characters', () => {
    expect(looksBinary([`${replacementChar}${replacementChar}ab`])).toBe(true)
  })

  test('Should accept ordinary text', () => {
    expect(
      looksBinary(['name,café', `one stray ${replacementChar} in a long line`])
    ).toBe(false)
    expect(looksBinary([])).toBe(false)
  })
})

describe('#normaliseLines', () => {
  test('Should strip carriage returns', () => {
    expect(normaliseLines(['a\r', 'b'])).toEqual({
      lines: ['a', 'b'],
      truncated: false
    })
  })

  test('Should shorten very long lines', () => {
    const { lines, truncated } = normaliseLines(['x'.repeat(maxLineChars + 5)])

    expect(lines[0]).toHaveLength(maxLineChars)
    expect(truncated).toBe(true)
  })
})
