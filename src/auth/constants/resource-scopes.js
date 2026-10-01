const resourceScopes = {
  cadsCds: {
    dbAdminExecute: 'admin.db.execute',
    adminS3Manager: 'admin.s3.manager',
    adminQueueManager: 'admin.queue.manager'
  },
  cadsBridge: {
    adminS3Manager: 'admin.s3.manager',
    adminQueueManager: 'admin.queue.manager'
  }
}

export { resourceScopes }
