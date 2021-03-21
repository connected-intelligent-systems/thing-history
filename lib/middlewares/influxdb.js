'use strict'

const env = require('env-var')
const {
  InfluxDB,
  flux,
  fluxExpression,
  fluxDateTime,
  fluxString,
  fluxFloat,
  fluxInteger,
  fluxBool,
  fluxDuration
} = require('@influxdata/influxdb-client')

const Bucket = env.get('INFLUXDB_BUCKET').required().asString()
const InfluxDBToken = env.get('INFLUXDB_TOKEN').required().asString()
const InfluxDBUrl = env.get('INFLUXDB_URL').required().asString()
const InfluxDBOriganization = env.get('INFLUXDB_ORG').required().asString()
const queryApi = new InfluxDB({
  url: InfluxDBUrl,
  token: InfluxDBToken
}).getQueryApi(InfluxDBOriganization)

/* Validate the suppported filter functions
 */
function validateFilterFunction (filterFunction) {
  return /^(eq|ne|gt|lt|le|ge)$/.test(filterFunction)
}

/* Validate the suppported aggegate functions
 */
function validateAggregateFunctions (filterFunction) {
  return /^(mean|stddev|median)$/.test(filterFunction)
}

/* Map to flux comparison operator
 */
function toFluxComparisonOperator (filterFunction) {
  switch (filterFunction) {
    case 'eq':
      return '=='
    case 'ne':
      return '!='
    case 'gt':
      return '>'
    case 'lt':
      return '<'
    case 'ge':
      return '>='
    case 'le':
      return '<='
  }
}

/* Sanitize the guessed type of the value
 */
function getFluxValue (value) {
  if (isNaN(value) === false) {
    if (Number.isInteger(parseFloat(value))) {
      return fluxInteger(value)
    }
    return fluxFloat(value)
  } else if (/^(true|false)$/.test(value) === true) {
    return fluxBool(value)
  } else {
    return fluxString(value)
  }
}

/* Create the stop query
 */
function createStopQuery (stop) {
  if (stop !== undefined) {
    return flux`, stop: ${fluxDateTime(stop)}`
  }
  return flux`, stop: ${fluxExpression('now()')}`
}

/* Create the stop query
 */
function createCreateEmptyQuery (createEmpty) {
  if (createEmpty !== undefined) {
    return flux`, createEmpty: ${fluxBool(createEmpty)}`
  }
  return flux``
}

/* Create aggregate window query
 */
function createAggregateWindowQuery (options) {
  if (options.aggregate !== undefined) {
    const { every = '10m', func = 'mean', createEmpty } = options.aggregate
    if (validateAggregateFunctions(func) === false) {
      throw new Error('test')
    }
    if (every !== undefined && func !== undefined) {
      return flux`|> aggregateWindow(every: ${fluxDuration(
        every
      )}, fn: ${fluxExpression(func)}${createCreateEmptyQuery(createEmpty)})`
    }
  } else {
    return flux``
  }
}

/* Create the flux query
 * @param {string} thingId - the thing id
 * @param {string} propertyName - the name of the property
 */
function createQuery (thingId, propertyName, options) {
  const { start, stop } = options
  return flux`from(bucket: ${fluxString(Bucket)})
|> range(start: ${fluxDateTime(start)} ${createStopQuery(stop)})
|> filter(fn: (r) => r["_measurement"] == "property_raw")
|> filter(fn: (r) => r["thingId"] == ${fluxString(thingId)})
|> filter(fn: (r) => r["propertyId"] == ${fluxString(propertyName)})
${createAggregateWindowQuery(options)}
`
}

/* Calculates the window line of a count query
 */
function createCountWindow (every) {
  if (every !== undefined) {
    return flux`|> window(every: ${fluxDuration(
      every
    )}, createEmpty: ${fluxBool('true')})`
  } else return flux``
}

/* Create the flux query to data
 */
function createFilterQuery (filters = []) {
  return filters.map(({ func, value }) => {
    if (validateFilterFunction(func) === false) {
      throw Error('test')
    }
    if (value === undefined) {
      throw Error('test')
    }
    return flux`|> filter(fn: (r) => r["_value"] ${fluxExpression(
      toFluxComparisonOperator(func)
    )} ${getFluxValue(value)})`
  })
}

/* Create the flux query to counter the number of records
 * @param {string} thingId - the thing id
 * @param {string} propertyName - the name of the property
 */
function createCountQuery (thingId, propertyName, options) {
  const { start, stop, every } = options
  const filters = createFilterQuery(options.filters)
  return flux`from(bucket: ${fluxString(Bucket)})
|> range(start: ${fluxDateTime(start)} ${createStopQuery(stop)})
|> filter(fn: (r) => r["_measurement"] == "property_raw")
|> filter(fn: (r) => r["thingId"] == ${fluxString(thingId)})
|> filter(fn: (r) => r["propertyId"] == ${fluxString(propertyName)}) 
${fluxExpression(filters.join('\r\n'))}
${createCountWindow(every)}
|> count()`
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
      console.log(createQuery(thingId, propertyName, options).fluxValue)
      runQuery(createQuery(thingId, propertyName, options), req, res)
    },
    count: (thingId, propertyName, options) => {
      console.log(createCountQuery(thingId, propertyName, options).fluxValue)
      runQuery(createCountQuery(thingId, propertyName, options), req, res)
    }
  }
  next()
}
