import {
  buildBreadcrumbs,
  explorerUrl,
  folderOf,
  relativeName,
  viewerUrl
} from './paths.js'

const bucket = { clientName: 'CadsInternalClient', bucketName: 'cads-internal' }

describe('#explorerUrl', () => {
  test('Should omit empty parameters', () => {
    expect(
      explorerUrl('CadsInternalClient', { prefix: '', page: undefined })
    ).toBe('/s3-monitoring/buckets/CadsInternalClient')
  })

  test('Should encode the client name and parameters', () => {
    expect(explorerUrl('a b', { prefix: 'x/y z/' })).toBe(
      '/s3-monitoring/buckets/a%20b?prefix=x%2Fy+z%2F'
    )
  })
})

describe('#viewerUrl', () => {
  test('Should put the key first', () => {
    expect(viewerUrl('C', 'a/b.csv', { startLine: 5 })).toBe(
      '/s3-monitoring/buckets/C/object?key=a%2Fb.csv&startLine=5'
    )
  })
})

describe('#folderOf', () => {
  test.each([
    ['', ''],
    ['imports/', 'imports/'],
    ['imports/2024-', 'imports/'],
    ['a/b/c.csv', 'a/b/'],
    ['top', '']
  ])('Should take the folder of %s', (prefix, folder) => {
    expect(folderOf(prefix)).toBe(folder)
  })
})

describe('#relativeName', () => {
  test('Should strip the current folder', () => {
    expect(relativeName('imports/a.csv', 'imports/')).toBe('a.csv')
    expect(relativeName('other/a.csv', 'imports/')).toBe('other/a.csv')
  })
})

describe('#buildBreadcrumbs', () => {
  test('Should make the bucket the current page at its root', () => {
    expect(buildBreadcrumbs(bucket)).toEqual([
      { text: 'Dashboard', href: '/dashboard' },
      { text: 'S3 Monitoring', href: '/s3-monitoring' },
      { text: 'cads-internal' }
    ])
  })

  test('Should link each folder and show a file name as the current page', () => {
    expect(buildBreadcrumbs(bucket, 'a/b/c.csv').slice(2)).toEqual([
      {
        text: 'cads-internal',
        href: '/s3-monitoring/buckets/CadsInternalClient'
      },
      {
        text: 'a',
        href: '/s3-monitoring/buckets/CadsInternalClient?prefix=a%2F'
      },
      {
        text: 'b',
        href: '/s3-monitoring/buckets/CadsInternalClient?prefix=a%2Fb%2F'
      },
      { text: 'c.csv' }
    ])
  })

  test('Should make the last folder the current page', () => {
    expect(buildBreadcrumbs(bucket, 'a/b/').at(-1)).toEqual({ text: 'b' })
  })
})
