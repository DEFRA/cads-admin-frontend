export function buildAzureSchema() {
  return {
    cadsCdsClientId: {
      doc: 'Client ID of the CADS CDS API (resource server)',
      format: String,
      default: '',
      env: 'AZURE_CLIENT_CADS_CDS_ID'
    },
    cadsBridgeClientId: {
      doc: 'Client ID of the CADS BRIDGE API (resource server)',
      format: String,
      default: '',
      env: 'AZURE_CLIENT_CADS_BRIDGE_ID'
    },
    useSimpleScopes: {
      doc: 'Use simple scope names (for mock OIDC or integration tests)',
      format: Boolean,
      default: false,
      env: 'USE_SIMPLE_SCOPES'
    }
  }
}
