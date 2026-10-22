const pageTitle = 'Data Dashboard'

export const dataController = {
  async handler(_request, h) {
    return h.view('data/index', {
      pageTitle: pageTitle,
      heading: pageTitle,
      breadcrumbs: [
        { text: 'Dashboard', href: '/dashboard' },
        { text: pageTitle }
      ]
    })
  }
}
