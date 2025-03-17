'use strict'

const { InsufficientPermissions } = require('../utils/http_errors')
const { sql } = require('../utils/pool')

const CredentialsType = 'ACCESS_TOKEN'

/**
 * Retrieves the value from a row object based on its data type.
 * @param {Object} row - The row object containing the data.
 * @param {boolean} [stringifyJson=true] - Indicates whether to stringify JSON values.
 * @returns {*} - The retrieved value from the row.
 */
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

/**
 * Retrieves the device ID associated with the given token.
 *
 * @param {string} token - The token to retrieve the device ID for.
 * @returns {Promise<number>} - The device ID associated with the token.
 * @throws {InsufficientPermissions} - If no device credentials are found for the given token.
 */
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

/**
 * Retrieves timeseries data based on the provided parameters.
 *
 * @param {string} token - The token used to authenticate the request.
 * @param {string} name - The name of the timeseries data to retrieve.
 * @param {number} from - The starting timestamp for the data retrieval.
 * @param {number} to - The ending timestamp for the data retrieval.
 * @param {boolean} [asJson=true] - Indicates whether the data should be returned as JSON or not.
 * @returns {Promise<string>} The timeseries data as a string.
 */
async function getTimeseries (token, name, from, to, asJson = true) {
  const deviceId = await getDeviceIdFromToken(token)
  if (asJson === false) {
    return sql`
      SELECT
          string_agg(
              ts::text || ',' || 
              COALESCE(bool_v::text, dbl_v::text, json_v::text, long_v::text, str_v::text),
              E'\n'
          ORDER BY ts ASC) as result
      FROM
          ts_kv
      WHERE
          ts_kv.key = (SELECT key_id FROM key_dictionary WHERE key = ${name})
          AND ts_kv.entity_id = ${deviceId}
          AND ts_kv.ts >= ${from}
          AND ts_kv.ts <= ${to};
        `
  } else {
    return sql`
      SELECT
          json_agg(
              json_build_object(
                  ${name}::text, 
                  COALESCE(
                      to_json(bool_v), 
                      to_json(dbl_v), 
                      to_json(json_v), 
                      to_json(long_v), 
                      to_json(str_v)
                  ),
                  'ts', ts
              )
              ORDER BY ts ASC
          )::text as result
      FROM
          ts_kv
      WHERE
          ts_kv.key = (SELECT key_id FROM key_dictionary WHERE key = ${name})
          AND ts_kv.entity_id = ${deviceId}
          AND ts_kv.ts >= ${from}
          AND ts_kv.ts <= ${to};
      `
  }
}

/**
 * Retrieves the latest value for a given name from the time series database.
 * @param {string} token - The token used to authenticate the request.
 * @param {string} name - The name of the value to retrieve.
 * @param {Object} options - Additional options for the query.
 * @param {boolean} options.includeTimestamps - Whether to include timestamps in the result. Default is false.
 * @returns {Promise<Object>} - A promise that resolves to the latest value.
 */
async function getLatestValue (token, name, { includeTimestamps = false } = {}) {
  const deviceId = await getDeviceIdFromToken(token)
  const result = await sql`
  SELECT
    * 
  FROM
    ts_kv_latest 
    JOIN
        key_dictionary 
        ON ts_kv_latest.key = key_dictionary.key_id 
  WHERE
    key_dictionary.key = ${name} 
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

/**
 * Retrieves the latest values from the time series for a given token.
 * @param {string} token - The token used to retrieve the latest values.
 * @param {Object} options - Additional options for the retrieval.
 * @param {boolean} options.includeTimestamps - Whether to include timestamps in the result. Default is false.
 * @returns {Promise<Object>} - A promise that resolves to an object containing the latest values.
 */
async function getLatestValues (token, { includeTimestamps = false } = {}) {
  const deviceId = await getDeviceIdFromToken(token)
  const result = await sql`
  SELECT
    * 
  FROM
    ts_kv_latest 
    JOIN
      key_dictionary 
      ON ts_kv_latest.key = key_dictionary.key_id 
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
