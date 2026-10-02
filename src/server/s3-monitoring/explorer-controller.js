import {
  listBuckets,
  listObjects
} from '../common/clients/requests/s3-storage.js'
import {
  renderS3Error,
  s3ErrorMessages,
  S3NotFoundError
} from './helpers/errors.js'
import {
  buildBreadcrumbs,
  explorerUrl,
  folderOf,
  relativeName,
  viewerUrl
} from './helpers/paths.js'

export const pageSizes = [25, 50, 100, 200]
export const defaultPageSize = 50

function text(value) {
  return (Array.isArray(value) ? value[0] : (value ?? '')).toString()
}

export function parseExplorerQuery(query) {
  const pageSize = Number(text(query.pageSize))

  return {
    prefix: text(query.prefix).replace(/^\/+/, ''),
    folder: text(query.folder).trim(),
    name: text(query.name).trim(),
    pageSize: pageSizes.includes(pageSize) ? pageSize : defaultPageSize,
    page: Math.max(1, Number.parseInt(text(query.page), 10) || 1)
  }
}

function contains(value, term) {
  return value.toLowerCase().includes(term.toLowerCase())
}

/**
 * Builds explorer URLs for one listing, carrying its filters forward and
 * leaving default values out of the query string.
 */
function createLinks(clientName, { prefix, folder, name, pageSize }) {
  const linkPageSize = pageSize === defaultPageSize ? undefined : pageSize

  return {
    pageSize: linkPageSize,
    page: (target) =>
      explorerUrl(clientName, {
        prefix,
        folder,
        name,
        pageSize: linkPageSize,
        page: target > 1 ? target : undefined
      }),
    folder: (folderPrefix) =>
      explorerUrl(clientName, { prefix: folderPrefix, pageSize: linkPageSize })
  }
}

async function loadListing(request, clientName, options) {
  const [buckets, listing] = await Promise.all([
    listBuckets(request),
    listObjects(request, clientName, { ...options, delimiter: '/' })
  ])

  const bucket = buckets.find((item) => item.clientName === clientName)
  if (!bucket) {
    throw new S3NotFoundError(s3ErrorMessages.bucketNotFound)
  }

  return { bucket, listing }
}

function folderEntries(listing, { currentFolder, folder, links }) {
  return listing.folders
    .map((folderPrefix) => ({
      name: relativeName(folderPrefix, currentFolder),
      url: links.folder(folderPrefix)
    }))
    .filter((entry) => !folder || contains(entry.name, folder))
}

function objectEntries(listing, { clientName, currentFolder, name }) {
  return (
    listing.objects
      .map((object) => ({
        ...object,
        name: relativeName(object.key, currentFolder),
        viewUrl: viewerUrl(clientName, object.key)
      }))
      // Skip the zero-byte marker object some tools create for a folder
      .filter((object) => object.name !== '')
      .filter((object) => !name || contains(object.name, name))
  )
}

function listEntries(listing, context) {
  const { folder, name } = context

  // Each filter narrows its own kind of entry; using only one of them
  // shows only that kind
  const showFolders = !name || Boolean(folder)
  const showFiles = !folder || Boolean(name)

  return {
    folders: showFolders ? folderEntries(listing, context) : [],
    objects: showFiles ? objectEntries(listing, context) : []
  }
}

function buildViewModel({ bucket, listing, filters, clientName, hasNextPage }) {
  const { prefix, folder, name, pageSize, page } = filters
  const links = createLinks(clientName, filters)

  // Names are shown relative to the folder being viewed
  const currentFolder = folderOf(prefix)
  const { folders, objects } = listEntries(listing, {
    clientName,
    currentFolder,
    folder,
    name,
    links
  })

  return {
    bucket,
    filters,
    location: `/${prefix}`,
    formAction: explorerUrl(clientName),
    clearFiltersUrl: explorerUrl(clientName, {
      prefix: currentFolder,
      pageSize: links.pageSize
    }),
    hasPageFilters: Boolean(folder || name),
    pageSizeItems: pageSizes.map((size) => ({
      value: size,
      text: `${size} per page`,
      selected: size === pageSize
    })),
    folders,
    objects,
    page,
    pagination: {
      previous: page > 1 ? { href: links.page(page - 1) } : undefined,
      next: hasNextPage ? { href: links.page(page + 1) } : undefined
    }
  }
}

/**
 * @param {{ pageTokens: ReturnType<typeof import('./helpers/page-tokens.js').createPageTokenStore> }} deps
 */
export function createExplorerController({ pageTokens }) {
  return {
    async handler(request, h) {
      const { clientName } = request.params
      const filters = parseExplorerQuery(request.query)
      const { prefix, pageSize, page } = filters

      const listingId = [clientName, prefix, pageSize]
      const continuationToken = await pageTokens.get(request, listingId, page)

      // Page never reached in this session (expired or hand-edited URL)
      if (continuationToken === undefined) {
        return h.redirect(createLinks(clientName, filters).page(1))
      }

      let loaded
      try {
        loaded = await loadListing(request, clientName, {
          prefix,
          maxKeys: pageSize,
          continuationToken
        })
      } catch (error) {
        return renderS3Error(request, h, error, {
          notFoundMessage: s3ErrorMessages.bucketNotFound
        })
      }
      const { bucket, listing } = loaded

      const hasNextPage = Boolean(
        listing.isTruncated && listing.nextContinuationToken
      )
      if (hasNextPage) {
        await pageTokens.set(
          request,
          listingId,
          page + 1,
          listing.nextContinuationToken
        )
      }

      return h.view('s3-monitoring/explorer', {
        pageTitle: `${bucket.bucketName} - S3 Monitoring`,
        heading: bucket.bucketName,
        breadcrumbs: buildBreadcrumbs(bucket, prefix),
        viewModel: buildViewModel({
          bucket,
          listing,
          filters,
          clientName,
          hasNextPage
        })
      })
    }
  }
}
