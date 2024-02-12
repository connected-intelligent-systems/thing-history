'use strict'

const { InsufficientPermissions } = require('../utils/http_errors')
const { sql } = require('../utils/pool')

const CredentialsType = 'ACCESS_TOKEN'

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
  const result = await sql`
    SELECT
      * 
    FROM
      device_credentials 
    WHERE
      credentials_id = ${token}
    AND credentials_type = ${CredentialsType}
  `

  if (result.count === 0) {
    throw new InsufficientPermissions()
  }

  return result[0].device_id
}

async function getTimeseries (token, name, from, to, asJson = true) {
  const deviceId = await getDeviceIdFromToken(token)
  if (asJson === false) {
    return sql`
      SELECT
        string_agg(
          ts::text ||','|| CASE
            WHEN bool_v IS NOT NULL THEN bool_v::text
            WHEN dbl_v IS NOT NULL THEN dbl_v::text
            WHEN json_v IS NOT NULL THEN json_v::text
            WHEN long_v IS NOT NULL THEN long_v::text
            WHEN str_v IS NOT NULL THEN str_v::text
          END,
          E'\n'
        ) as result
      FROM
        ts_kv
      WHERE
        ts_kv.key = (select key_id from ts_kv_dictionary where key = ${name})
        AND ts_kv.entity_id = ${deviceId}
        AND ts_kv.ts >= ${from}
        AND ts_kv.ts <= ${to}
        ORDER BY ts_kv.ts ASC
        `
  } else {
    return sql`
      SELECT
        json_agg(
          json_build_object(
            ${name}::text, CASE
                WHEN bool_v IS NOT NULL THEN to_json(bool_v)
                WHEN dbl_v IS NOT NULL THEN to_json(dbl_v)
                WHEN json_v IS NOT NULL THEN to_json(json_v)
                WHEN long_v IS NOT NULL THEN to_json(long_v)
                WHEN str_v IS NOT NULL THEN to_json(str_v)
            END,
            'ts', ts
          )
        )::text as result
      FROM
        ts_kv
      WHERE
        ts_kv.key = (select key_id from ts_kv_dictionary where key = ${name})
        AND ts_kv.entity_id = ${deviceId}
        AND ts_kv.ts >= ${from}
        AND ts_kv.ts <= ${to}
        ORDER BY ts_kv.ts ASC
      `
  }
}

async function getLatestValue (token, name, { includeTimestamps = false } = {}) {
  const deviceId = await getDeviceIdFromToken(token)
  const result = await sql`
  SELECT
    * 
  FROM
    ts_kv_latest 
    JOIN
        ts_kv_dictionary 
        ON ts_kv_latest.key = ts_kv_dictionary.key_id 
  WHERE
    ts_kv_dictionary.key = ${name} 
    AND ts_kv_latest.entity_id::text = ${deviceId}
  `

  if (result.count === 0) {
    return {}
  }

  if (includeTimestamps === true) {
    return {
      [name]: getValueFromRow(result[0]),
      ts: parseInt(result[0].ts)
    }
  } else {
    return getValueFromRow(result[0])
  }
}

async function getLatestValues (token, { includeTimestamps = false } = {}) {
  const deviceId = await getDeviceIdFromToken(token)
  const result = await sql`
  SELECT
    * 
  FROM
    ts_kv_latest 
    JOIN
      ts_kv_dictionary 
      ON ts_kv_latest.key = ts_kv_dictionary.key_id 
  WHERE
    ts_kv_latest.entity_id::text = ${deviceId}
  `

  if (result.count === 0) {
    return {}
  }

  if (includeTimestamps === true) {
    return result.map((row) => ({
      [row.key]: getValueFromRow(row),
      ts: parseInt(row.ts)
    }))
  }

  return result.reduce((acc, row) => {
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
