export const dataController = {
  async handler(_request, h) {
    return h.view('data/index', {
      pageTitle: 'Data Dashboard',
      heading: 'Data Dashboard',
      breadcrumbs: [
        { text: 'Dashboard', href: '/dashboard' },
        { text: 'Data Dashboard' }
      ]
    })
  }
}
