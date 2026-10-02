import { listBuckets } from '../common/clients/requests/s3-storage.js'
import { renderS3Error } from './helpers/errors.js'
import { bucketListUrl, explorerUrl } from './helpers/paths.js'

const breadcrumbs = [
  { text: 'Dashboard', href: '/dashboard' },
  { text: 'S3 Monitoring' }
]

export const s3MonitoringDashboardController = {
  async handler(request, h) {
    const sort = request.query.sort === 'desc' ? 'desc' : 'asc'

    let buckets
    try {
      buckets = await listBuckets(request)
    } catch (error) {
      return renderS3Error(request, h, error, { breadcrumbs })
    }

    const sorted = [...buckets].sort((a, b) =>
      (a.bucketName ?? '').localeCompare(b.bucketName ?? '')
    )
    if (sort === 'desc') {
      sorted.reverse()
    }

    return h.view('s3-monitoring/index', {
      pageTitle: 'S3 Monitoring',
      heading: 'S3 folder and file monitoring',
      breadcrumbs,
      viewModel: {
        sort,
        sortUrl: bucketListUrl({ sort: sort === 'asc' ? 'desc' : 'asc' }),
        // The API may not return region or object counts for every bucket
        showRegion: sorted.some((bucket) => bucket.region),
        showTotalObjects: sorted.some((bucket) => bucket.totalObjects != null),
        buckets: sorted.map((bucket) => ({
          ...bucket,
          regionText: bucket.region || 'Not available',
          totalObjectsText:
            bucket.totalObjects == null
              ? 'Not available'
              : bucket.totalObjects.toLocaleString('en-GB'),
          exploreUrl: explorerUrl(bucket.clientName)
        }))
      }
    })
  }
}
