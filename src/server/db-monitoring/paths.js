export const dbMonitoringPath = '/db-monitoring'

export const postgresPerformancePath = `${dbMonitoringPath}/postgres-performance`

export const ctsImportPath = `${dbMonitoringPath}/cts-import`

// The detailed monitoring view for one command (LANI-650)
export function postgresDetailPath(command) {
  return `${postgresPerformancePath}/${command}`
}

export function postgresActionPath(actionId) {
  return `${postgresPerformancePath}/actions/${actionId}`
}
