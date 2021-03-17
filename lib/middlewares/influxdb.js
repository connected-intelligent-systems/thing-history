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
const CsvColumns = ['_time', '_value', 'propertyId', 'thingId']

/* Map selected properties of the row
 */
function mapJsonRow (row) {
  return {
    time: row._time,
    value: row._value,
    propertyId: row.propertyId,
    thingId: row.thingId
  }
}

/*
 */
function mapCsvRow (row, mappingIndices) {
  return row.filter((r, i) => mappingIndices.includes(i))
}

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
    let mappingIndices
    const isJson = req.accepts('json') === 'json'
    if (isJson === true) {
      res.setHeader('content-type', 'appplication/json')
      res.write('[')
    } else {
      res.setHeader('content-type', 'text/csv')
    }

    queryApi.queryRows(createQuery(thingId, propertyName, start, stop), {
      next (row, tableMeta) {
        if (firstRow === true) {
          if (isJson === true) {
            const jsonRow = tableMeta.toObject(row)
            res.write(JSON.stringify(mapJsonRow(jsonRow)))
          } else {
            if (mappingIndices === undefined) {
              mappingIndices = tableMeta.columns
                .filter((c) => CsvColumns.includes(c.label))
                .map((c) => c.index)
            }
            res.write(
              tableMeta.columns
                .filter((column) => mappingIndices.includes(column.index))
                .map((column) => column.label.replace(/^_/i, ''))
                .join(',') + '\n'
            )
            res.write(mapCsvRow(row, mappingIndices).join(',') + '\n')
          }
          firstRow = false
        } else {
          if (isJson === true) {
            const jsonRow = tableMeta.toObject(row)
            res.write(',' + JSON.stringify(mapJsonRow(jsonRow)))
          } else {
            res.write(mapCsvRow(row, mappingIndices).join(',') + '\n')
          }
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
