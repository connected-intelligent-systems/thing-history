'use strict'

const env = require('env-var')
const { InfluxDB } = require('@influxdata/influxdb-client')

const Bucket = env.get('INFLUXDB_BUCKET').required().asString()
const InfluxDBToken = env.get('INFLUXDB_TOKEN').required().asString()
const InfluxDBUrl = env.get('INFLUXDB_URL').required().asString()
const InfluxDBOriganization = env.get('INFLUXDB_ORG').required().asString()
const queryApi = new InfluxDB({
  url: InfluxDBUrl,
  token: InfluxDBToken
}).getQueryApi(InfluxDBOriganization)

/* Create the flux query
 * @param {string} thingId - the thing id
 * @param {string} propertyName - the name of the property
 */
function createQuery (thingId, propertyName, start, stop = 'now()') {
  return `
  from(bucket: "${Bucket}")
  |> range(start: ${start}, stop: ${stop})
  |> filter(fn: (r) => r["_measurement"] == "property_raw")
  |> filter(fn: (r) => r["thingId"] == "${thingId}")
  |> filter(fn: (r) => r["propertyId"] == "${propertyName}")  
    `
}

exports = module.exports = (req, res, next) => {
  req.queryInfluxDB = (thingId, propertyName, start, stop) => {
    let firstRow = true
    const isJson = req.accepts('json') === 'json'

    if (isJson === true) {
      res.write('[')
    }

    queryApi.queryRows(createQuery(thingId, propertyName, start, stop), {
      next (row, tableMeta) {
        const jsonRow = tableMeta.toObject(row)
        if (firstRow === true) {
          if (isJson === true) {
            res.write(JSON.stringify(jsonRow))
          } else {
            res.write(
              tableMeta.columns.map((column) => column.label).join(',') + '\n'
            )
          }
          firstRow = false
        }
        if (isJson === true) {
          res.write(',' + JSON.stringify(jsonRow))
        } else {
          res.write(row.join(',') + '\n')
        }
      },
      error () {
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
  next()
}
