export const homeController = {
  handler(_request, h) {
    return h.view('home/index', {
      pageTitle: 'Home',
      heading: 'Home',
      isAuthenticated: Boolean(_request?.auth?.credentials)
    })
  }
}
