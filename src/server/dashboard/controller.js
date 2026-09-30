export const dashboardController = {
  async handler(request, h) {
    return h.view('dashboard/index', {
      pageTitle: 'Dashboard',
      heading: 'Dashboard',
      breadcrumbs: [],
      viewModel: {
      }
    })
  }
}
