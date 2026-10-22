// Results in the shape returned by POST /api/v1/systemadmin/db-admin-execute-command,
// using the sample data from the LANI-651 layout skeleton
export const postgresResults = {
  sessions_by_state: [
    { state: 'active', sessions: 12 },
    { state: 'idle', sessions: 48 },
    { state: 'idle in transaction', sessions: 3 }
  ],
  active_queries: [
    {
      pid: 45288,
      usename: 'reporting',
      datname: 'cads',
      application_name: 'Portal',
      client_addr: '10.0.8.17',
      state: 'active',
      wait_event_type: null,
      wait_event: null,
      duration: '00:05:18',
      query: 'SELECT * FROM cads.movements WHERE secret = 1'
    },
    {
      pid: 45231,
      usename: 'cads_api',
      datname: 'cads',
      application_name: 'Import Service',
      client_addr: '10.0.12.45',
      state: 'active',
      wait_event_type: 'IO',
      wait_event: 'DataFileRead',
      duration: '00:30:24.5',
      query: 'INSERT INTO cads.animals VALUES (1)'
    }
  ],
  transactions: [
    {
      datname: 'cads',
      xact_commit: 12568234,
      xact_rollback: 1834,
      total_transactions: 12570068
    },
    {
      datname: 'cts',
      xact_commit: 8421178,
      xact_rollback: 812,
      total_transactions: 8421990
    }
  ],
  rows_activity: [
    {
      datname: 'cads',
      tup_returned: 1923456789,
      tup_fetched: 812345678,
      tup_inserted: 2456789,
      tup_updated: 123456,
      tup_deleted: 8921
    }
  ],
  buffer_cache_hit_ratio: [
    {
      datname: 'cads',
      blks_hit: 548972345,
      blks_read: 4134567,
      cache_hit_ratio_percent: 99.25
    },
    {
      datname: 'cts',
      blks_hit: 238734221,
      blks_read: 5241112,
      cache_hit_ratio_percent: 97.85
    }
  ],
  locks_and_blocking: [
    {
      blocked_pid: 43211,
      blocked_query: 'UPDATE cads.animals SET x = 1',
      blocking_pid: 41872,
      blocking_query: 'VACUUM FULL cads.animals',
      blocked_duration: '00:04:03'
    }
  ],
  idle_in_transaction: [
    {
      pid: 42112,
      usename: 'portal',
      datname: 'cads',
      client_addr: '10.0.1.1',
      transaction_age: '01:22:00',
      idle_duration: '01:16:00',
      query: 'SELECT * FROM cads.animals'
    }
  ],
  // No rows: the backend returns an empty object rather than a list
  prepared_transactions: {},
  table_activity: [
    {
      schemaname: 'cads',
      table_name: 'animals',
      seq_scan: 112,
      seq_tup_read: 1000,
      idx_scan: 18423,
      idx_tup_fetch: 5000,
      n_tup_ins: 124512,
      n_tup_upd: 18234,
      n_tup_del: 321,
      n_live_tup: 124567892,
      n_dead_tup: 18762,
      last_vacuum: null,
      last_autovacuum: '2026-06-26T08:15:00Z',
      last_analyze: null,
      last_autoanalyze: null
    }
  ],
  index_usage: [
    {
      schemaname: 'cads',
      table_name: 'animals',
      index_name: 'pk_animals',
      idx_scan: 22344561,
      idx_tup_read: 154222111,
      idx_tup_fetch: 98221121
    }
  ],
  largest_tables: [
    {
      schemaname: 'cts',
      table_name: 'ct_animal_statuses',
      total_size: '18 GB',
      table_size: '14 GB',
      index_size: '4 GB',
      n_live_tup: 365441221,
      n_dead_tup: 12231
    },
    {
      schemaname: 'cts',
      table_name: 'ct_registered_movements',
      total_size: '105 GB',
      table_size: '82 GB',
      index_size: '23 GB',
      n_live_tup: 549234812,
      n_dead_tup: 321123
    }
  ],
  database_size: [
    { datname: 'cads', size_bytes: 521838526464, size_pretty: '486 GB' },
    { datname: 'cts', size_bytes: 227633266688, size_pretty: '212 GB' }
  ],
  slow_queries: [
    {
      queryid: 8342112,
      calls: 1821,
      total_exec_time_ms: 942231,
      mean_exec_time_ms: 517.4,
      max_exec_time_ms: 2142,
      rows: 845231,
      query: 'SELECT secret FROM cads.movements'
    }
  ],
  shared_block_reads: [
    {
      queryid: 8342112,
      calls: 1821,
      shared_blks_read: 421223,
      shared_blks_hit: 15422344,
      hit_ratio_percent: 97.34,
      query: 'SELECT secret FROM cads.movements'
    }
  ]
}

// Text from the results that must never reach the page
export const sensitiveValues = [
  'SELECT * FROM cads.movements WHERE secret = 1',
  'INSERT INTO cads.animals',
  'UPDATE cads.animals SET',
  'VACUUM FULL',
  'SELECT secret FROM',
  '10.0.8.17',
  '10.0.12.45',
  '10.0.1.1'
]
