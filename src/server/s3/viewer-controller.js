import {
  getObjectRows,
  listBuckets,
  listObjects
} from '../common/clients/requests/s3-storage.js'
import { statusCodes } from '../common/constants/status-codes.js'
import {
  renderS3Error,
  s3ErrorMessages,
  S3NotFoundError
} from './helpers/errors.js'
import {
  buildBreadcrumbs,
  explorerUrl,
  folderOf,
  viewerUrl
} from './helpers/paths.js'
import {
  defaultLineCount,
  detectFormat,
  isBinaryKey,
  looksBinary,
  maxLinesPerRequest,
  normaliseLines,
  previewFormats
} from './helpers/file-preview.js'
import { highlightLines } from './helpers/highlight.js'
import { formatBytes } from '../../config/nunjucks/filters/format-bytes.js'

function text(value) {
  return (Array.isArray(value) ? value[0] : (value ?? '')).toString().trim()
}

function parseLineNumber(value) {
  return /^\d+$/.test(value) ? Number(value) : Number.NaN
}

/**
 * Reads and validates the line range. Both ends are optional: the start
 * defaults to line 1 and the end to a default-sized slice from the start.
 */
export function parseViewerQuery(query) {
  const errors = {}
  const startText = text(query.startLine)
  const endText = text(query.endLine)
  const format = text(query.format)

  let startLine = startText ? parseLineNumber(startText) : 1
  if (!(startLine >= 1)) {
    errors.startLine = 'Start line must be a whole number, 1 or more'
    startLine = 1
  }

  let endLine = endText
    ? parseLineNumber(endText)
    : startLine + defaultLineCount - 1
  if (!(endLine >= 1)) {
    errors.endLine = 'End line must be a whole number, 1 or more'
  } else if (endLine < startLine) {
    errors.endLine = 'End line must be the same as or after the start line'
  } else if (endLine - startLine + 1 > maxLinesPerRequest) {
    errors.endLine = `You can view up to ${maxLinesPerRequest.toLocaleString('en-GB')} lines at a time`
  } else {
    // The requested end line is valid, so keep it
  }
  if (errors.endLine) {
    endLine = startLine + defaultLineCount - 1
  }

  return {
    key: text(query.key),
    startLine,
    endLine,
    startText,
    endText,
    format: format in previewFormats ? format : 'auto',
    errors
  }
}

/**
 * Bucket and object metadata. There is no metadata endpoint, so the object
 * is found by listing with its own key as the prefix: an exact match always
 * sorts first.
 */
async function loadObject(request, clientName, key) {
  const [bucketsResult, listingResult] = await Promise.allSettled([
    listBuckets(request),
    key
      ? listObjects(request, clientName, { prefix: key, maxKeys: 1 })
      : Promise.resolve({ objects: [] })
  ])

  if (bucketsResult.status === 'rejected') {
    throw bucketsResult.reason
  }

  const bucket = bucketsResult.value.find(
    (item) => item.clientName === clientName
  )
  if (!bucket) {
    throw new S3NotFoundError(s3ErrorMessages.bucketNotFound)
  }

  if (listingResult.status === 'rejected') {
    throw Object.assign(listingResult.reason, { bucket })
  }

  const object = listingResult.value.objects.find((item) => item.key === key)
  if (!object) {
    throw Object.assign(new S3NotFoundError(s3ErrorMessages.objectNotFound), {
      bucket
    })
  }

  return { bucket, object }
}

/**
 * The requested slice of the file, or why it cannot be previewed.
 */
async function loadPreview(request, clientName, object, range, format) {
  if (object.size === 0) {
    return { status: 'empty' }
  }

  if (isBinaryKey(object.key)) {
    return { status: 'binary' }
  }

  let slice
  try {
    slice = await getObjectRows(request, clientName, {
      key: object.key,
      startRow: range.startLine,
      rowCount: range.endLine - range.startLine + 1
    })
  } catch (error) {
    // The backend rejects content with no line break within its row limit
    if (error?.output?.statusCode === statusCodes.badRequest) {
      return { status: 'no-line-breaks' }
    }
    throw error
  }

  if (looksBinary(slice.rows)) {
    return { status: 'binary' }
  }

  const { lines, truncated } = normaliseLines(slice.rows)
  if (lines.length === 0) {
    return { status: 'past-end' }
  }

  const tokens = highlightLines(lines, format)

  return {
    status: 'ok',
    format,
    truncated,
    reachedEnd: slice.reachedEnd,
    firstLine: range.startLine,
    lastLine: range.startLine + lines.length - 1,
    lines: tokens.map((lineTokens, index) => ({
      number: range.startLine + index,
      tokens: lineTokens
    }))
  }
}

function formatSize(size) {
  return size >= 1024
    ? `${formatBytes(size)} (${size.toLocaleString('en-GB')} bytes)`
    : formatBytes(size)
}

function renderViewerError(request, h, error, bucket, key) {
  const knownBucket = bucket ?? error?.bucket
  return renderS3Error(request, h, error, {
    notFoundMessage: s3ErrorMessages.objectNotFound,
    breadcrumbs: knownBucket ? buildBreadcrumbs(knownBucket, key) : undefined
  })
}

/**
 * Links to the slices either side of the current one, the same size as it.
 */
function buildPaging(clientName, query, preview) {
  const { key, startLine, endLine } = query
  const lineCount = endLine - startLine + 1
  const format = query.format === 'auto' ? undefined : query.format
  const rangeUrl = (from, to) =>
    viewerUrl(clientName, key, { startLine: from, endLine: to, format })

  return {
    previousUrl:
      preview && startLine > 1
        ? rangeUrl(Math.max(1, startLine - lineCount), startLine - 1)
        : undefined,
    nextUrl:
      preview?.status === 'ok' && !preview.reachedEnd
        ? rangeUrl(endLine + 1, endLine + lineCount)
        : undefined,
    lineCount
  }
}

function buildViewModel(clientName, query, { bucket, object, preview }) {
  return {
    bucket,
    object,
    sizeText: formatSize(object.size),
    query,
    preview,
    formAction: `${explorerUrl(clientName)}/object`,
    folderUrl: explorerUrl(clientName, { prefix: folderOf(query.key) }),
    errorList: Object.entries(query.errors).map(([field, message]) => ({
      text: message,
      href: `#${field}`
    })),
    formatItems: Object.entries(previewFormats).map(([value, label]) => ({
      value,
      text: label,
      selected: value === query.format
    })),
    ...buildPaging(clientName, query, preview)
  }
}

export const s3FileViewerController = {
  async handler(request, h) {
    const { clientName } = request.params
    const query = parseViewerQuery(request.query)
    const { key, startLine, endLine, errors } = query
    const hasErrors = Object.keys(errors).length > 0

    let bucket
    let object
    let preview = null
    try {
      ;({ bucket, object } = await loadObject(request, clientName, key))

      if (!hasErrors) {
        const format =
          query.format === 'auto' ? detectFormat(key) : query.format
        preview = await loadPreview(
          request,
          clientName,
          object,
          { startLine, endLine },
          format
        )
      }
    } catch (error) {
      return renderViewerError(request, h, error, bucket, key)
    }

    const fileName = key.slice(key.lastIndexOf('/') + 1) || key

    return h
      .view('s3-monitoring/viewer', {
        pageTitle: `${hasErrors ? 'Error: ' : ''}${fileName} - S3 Monitoring`,
        heading: fileName,
        breadcrumbs: buildBreadcrumbs(bucket, key),
        viewModel: buildViewModel(clientName, query, {
          bucket,
          object,
          preview
        })
      })
      .code(hasErrors ? statusCodes.badRequest : statusCodes.ok)
  }
}
