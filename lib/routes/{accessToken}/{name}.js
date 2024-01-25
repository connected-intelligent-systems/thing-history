'use strict'

const { getValueFromRow, getTimeseries } = require('../../models/timeseries')

async function get (req, res, next) {
  try {
    const { from = Date.now() - 86400000, to = Date.now() } = req.query
    const query = await getTimeseries(
      req.params.accessToken,
      req.params.name,
      from,
      to
    )

    if (req.accepts('text/csv')) {
      res.setHeader('content-type', 'text/csv')
      res.write(`timestamp,${req.params.name}\n`)
      for await (const row of query) {
        const ts = parseInt(row.ts)
        const value = getValueFromRow(row)
        res.write(`${ts},${value}\n`)
      }
      res.end()
    } else {
      res.setHeader('content-type', 'application/json')
      let hasWritten = false
      res.write('[')
      for (const row of query) {
        const result = {
          ts: parseInt(row.ts),
          [req.params.name]: getValueFromRow(row)
        }
        if (hasWritten === false) {
          res.write(`${JSON.stringify(result)}`)
          hasWritten = true
        } else {
          res.write(`,${JSON.stringify(result)}`)
        }
      }
      res.write(']')
      res.end()
    }
  } catch (e) {
    next(e)
  }
}

exports = module.exports = {
  get
}
