'use strict'

const QueryStream = require('pg-query-stream')
const { InsufficientPermissions } = require('../utils/http_errors')
const { pool } = require('../utils/pool')

const CredentialsType = 'ACCESS_TOKEN'

const postgresSelectTimeseries = `SELECT
   * 
FROM
   ts_kv 
   JOIN
      ts_kv_dictionary 
      ON ts_kv.key = ts_kv_dictionary.key_id 
WHERE
   ts_kv_dictionary.key = $1 
   AND ts_kv.entity_id::text = $2
   AND ts_kv.ts >= $3
   AND ts_kv.ts <= $4
`

const postgresSelectLatest = `SELECT
   * 
FROM
   ts_kv_latest 
   JOIN
      ts_kv_dictionary 
      ON ts_kv_latest.key = ts_kv_dictionary.key_id 
WHERE
   ts_kv_dictionary.key = $1 
   AND ts_kv_latest.entity_id::text = $2
`

const postgresSelectDeviceCredentials = `SELECT
* 
FROM
device_credentials 
WHERE
credentials_id = $1 
AND credentials_type = $2
`

function getValueFromRow (row, stringifyJson = true) {
  if (row.bool_v !== null) {
    return row.bool_v === 'true'
  } else if (row.dbl_v !== null) {
    return parseFloat(row.dbl_v)
  } else if (row.json_v !== null) {
    if (stringifyJson) {
      return JSON.stringify(row.json_v)
    } else {
      return row.json_v
    }
  } else if (row.long_v !== null) {
    return parseInt(row.long_v)
  } else if (row.str_v !== null) {
    return row.str_v
  }
}

async function getDeviceIdFromToken (token) {
  const result = await pool.query(postgresSelectDeviceCredentials, [
    token,
    CredentialsType
  ])
  if (result.rowCount === 0) {
    throw new InsufficientPermissions()
  }

  return result.rows[0].device_id
}

async function getTimeseries (token, name, from, to) {
  const deviceId = await getDeviceIdFromToken(token)
  const client = await pool.connect()
  const stream = client.query(
    new QueryStream(postgresSelectTimeseries, [name, deviceId, from, to])
  )
  stream.on('end', () => client.release())
  return stream
}

async function getLatest (token, name) {
  const deviceId = await getDeviceIdFromToken(token)
  const result = await pool.query(postgresSelectLatest, [name, deviceId])

  if (result.rowCount === 0) {
    return {}
  }

  return {
    [name]: getValueFromRow(result.rows[0]),
    ts: parseInt(result.rows[0].ts)
  }
}

exports = module.exports = {
  getTimeseries,
  getLatest,
  getValueFromRow
}
