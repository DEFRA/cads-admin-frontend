import Blankie from 'blankie'

/**
 * Manage content security policies.
 * @satisfies {import('@hapi/hapi').Plugin}
 */
const contentSecurityPolicy = {
  plugin: Blankie,
  options: {
    // Hash 'sha256-GUQ5ad8JK5KmEWmROf3LZd9ge94daqNvd8xy9YS1iDw=' is to support a GOV.UK frontend script bundled within Nunjucks macros
    // https://frontend.design-system.service.gov.uk/import-javascript/#if-our-inline-javascript-snippet-is-blocked-by-a-content-security-policy
    defaultSrc: ['self'],
    fontSrc: [
      'self',
      'data:',
      'https://fonts.gstatic.com',
      'https://cdn.jsdelivr.net'
    ],
    connectSrc: [
      'self',
      'wss',
      'data:',
      'https://api.os.uk',
      'https://cdn.jsdelivr.net',
      'https://unpkg.com'
    ],
    mediaSrc: ['self'],
    styleSrc: [
      'self',
      'https://cdn.jsdelivr.net',
      'https://unpkg.com',
      'https://fonts.googleapis.com'
    ],
    workerSrc: ['self', 'blob:'],
    scriptSrc: [
      'self',
      /* 'sha256-GUQ5ad8JK5KmEWmROf3LZd9ge94daqNvd8xy9YS1iDw=',
      'sha256-SVqUqmzqtVvB2OHJmQ6BHUPco3WdL2WA5OLU8u0i2qw=',*/
      'unsafe-inline',
      'https://cdn.jsdelivr.net',
      'https://d3js.org',
      'https://unpkg.com',
      'https://api.os.uk'
    ],

    imgSrc: ['self', 'data:'],
    frameSrc: ['self', 'data:'],
    objectSrc: ['none'],
    frameAncestors: ['none'],
    formAction: ['self'],
    manifestSrc: ['self'],
    generateNonces: false
  }
}

export { contentSecurityPolicy }
