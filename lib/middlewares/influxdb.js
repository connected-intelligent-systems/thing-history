'use strict'

const env = require('env-var')
const { InfluxDB, flux, fluxExpression, fluxDateTime } = require('@influxdata/influxdb-client')

const Bucket = env.get('INFLUXDB_BUCKET').required().asString()
const InfluxDBToken = env.get('INFLUXDB_TOKEN').required().asString()
const InfluxDBUrl = env.get('INFLUXDB_URL').required().asString()
const InfluxDBOriganization = env.get('INFLUXDB_ORG').required().asString()
const queryApi = new InfluxDB({
  url: InfluxDBUrl,
  token: InfluxDBToken
}).getQueryApi(InfluxDBOriganization)

/* Validates a influxdb duration
 * @param {string} duration - influxdb duration string
 */
function validateDuration (duration) {
  return /(-?\d+(ns|us|ms|s|m|h|d|w|mo|y))+/.test(duration)
}

function createStop (stop) {
  if (stop !== undefined) {
    return `, stop: ${stop}`
  }
  return ''
}

/* Create the flux query
 * @param {string} thingId - the thing id
 * @param {string} propertyName - the name of the property
 */
function createQuery (thingId, propertyName, options) {
  const { start, stop } = options
  return flux(`
  from(bucket: "${Bucket}")
  |> range(start: ${start} ${createStop(stop)})
  |> filter(fn: (r) => r["_measurement"] == "property_raw")
  |> filter(fn: (r) => r["thingId"] == "${thingId}")
  |> filter(fn: (r) => r["propertyId"] == "${propertyName}")  
    `)
}

/* Calculates the window line of a count query
 */
function createCountWindow ({ window }) {
  if (window !== undefined) {
    return `|> window(every: ${window})`
  } else return ''
}

/* Create the flux query
 * @param {string} thingId - the thing id
 * @param {string} propertyName - the name of the property
 */
// filterTresholdMin='10'
// filterTresholdMax='20'  
// filterEquals='30' 
// filterWindow
function createCountQuery (thingId, propertyName, options) {
  try {
  const start = fluxDateTime("test")
  const stop = fluxExpression(options.stop || 'now()') 
  return flux`
  from(bucket: "${Bucket}")
  |> range(start: ${start}, stop: ${stop})
  |> filter(fn: (r) => r["_measurement"] == "property_raw")
  |> filter(fn: (r) => r["thingId"] == "${thingId}")
  |> filter(fn: (r) => r["propertyId"] == "${propertyName}")  
  |> filter(fn: (r) => r["thingId"] == ${asd})
    `
  } catch(e) {
    // ${createCountWindow(options)}
    console.log(e)
  }
}

/* Run a influxdb query by rows and return csv or json
 * @param {string} query - the query
 * @param {object} req - the incoming http request
 * @param {object} res - the incoming http response
 */
function runQuery (query, req, res) {
  let firstRow = true
  const isJson = req.accepts('json') === 'json'
  if (isJson === true) {
    res.setHeader('content-type', 'appplication/json')
    res.write('[')
  } else {
    res.setHeader('content-type', 'text/csv')
  }

  queryApi.queryRows(query, {
    next (row, tableMeta) {
      if (firstRow === true) {
        if (isJson === true) {
          const jsonRow = tableMeta.toObject(row)
          res.write(JSON.stringify(jsonRow))
        } else {
          res.write(tableMeta.columns.map((c) => c.label).join(',') + '\n')
          res.write(row.join(',') + '\n')
        }
        firstRow = false
      } else {
        if (isJson === true) {
          const jsonRow = tableMeta.toObject(row)
          res.write(',' + JSON.stringify(jsonRow))
        } else {
          res.write(row.join(',') + '\n')
        }
      }
    },
    error (e) {
      res.status(500).send('Internal server Error')
    },
    complete () {
      if (isJson === true) {
        res.write(']')
      }
      res.status(200).end()
    }
  })
}

exports = module.exports = (req, res, next) => {
  req.influxDB = {
    query: (thingId, propertyName, options) => {
      runQuery(createQuery(thingId, propertyName, options), req, res)
    },
    count: (thingId, propertyName, options) => {
      runQuery(createCountQuery(thingId, propertyName, options), req, res)
    }
  }
  next()
}
