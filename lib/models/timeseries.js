'use strict'

const { InsufficientPermissions } = require('../utils/http_errors')
const { pool } = require('../utils/pool')

const CredentialsType = 'ACCESS_TOKEN'
const PostgresSelectTimeseries = `SELECT
   bool_v,
   dbl_v,
   json_v,
   long_v,
   str_v,
   ts 
FROM
   ts_kv
WHERE
   ts_kv.key = (select key_id from ts_kv_dictionary where key = $1)
   AND ts_kv.entity_id = $2
   AND ts_kv.ts >= $3
   AND ts_kv.ts <= $4
ORDER BY ts_kv.ts ASC
`
const PostgresSelectLatest = `SELECT
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
const PostgresSelectAllLatest = `SELECT
   * 
FROM
   ts_kv_latest 
   JOIN
      ts_kv_dictionary 
      ON ts_kv_latest.key = ts_kv_dictionary.key_id 
WHERE
  ts_kv_latest.entity_id::text = $1
`
const PostgresSelectDeviceCredentials = `SELECT
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
  const result = await pool.query(PostgresSelectDeviceCredentials, [
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
  return pool.query(PostgresSelectTimeseries, [name, deviceId, from, to])
}

async function getLatestValue (token, name, { includeTimestamps = false } = {}) {
  const deviceId = await getDeviceIdFromToken(token)
  const result = await pool.query(PostgresSelectLatest, [name, deviceId])

  if (result.rowCount === 0) {
    return {}
  }

  if (includeTimestamps === true) {
    return {
      [name]: getValueFromRow(result.rows[0]),
      ts: parseInt(result.rows[0].ts)
    }
  } else {
    return getValueFromRow(result.rows[0])
  }
}

async function getLatestValues (token, { includeTimestamps = false } = {}) {
  const deviceId = await getDeviceIdFromToken(token)
  const result = await pool.query(PostgresSelectAllLatest, [deviceId])

  if (result.rowCount === 0) {
    return {}
  }

  if (includeTimestamps === true) {
    return result.rows.map((row) => ({
      [row.key]: getValueFromRow(row),
      ts: parseInt(row.ts)
    }))
  }

  return result.rows.reduce((acc, row) => {
    const value = getValueFromRow(row)
    return {
      ...acc,
      [row.key]: value
    }
  }, {})
}

exports = module.exports = {
  getValueFromRow,
  getTimeseries,
  getLatestValue,
  getLatestValues
}
