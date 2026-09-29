export function buildAzureSchema() {
  return {
    cadsCdsClientId: {
      doc: 'Client ID of the CADS CDS API (resource server)',
      format: String,
      default: '',
      env: 'AZURE_CLIENT_CADS_CDS_ID'
    },
    useSimpleScopes: {
      doc: 'Use simple scope names (for mock OIDC or integration tests)',
      format: Boolean,
      default: false,
      env: 'USE_SIMPLE_SCOPES'
    }
  }
}
