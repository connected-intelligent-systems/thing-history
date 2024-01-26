'use strict'

const { getTimeseries } = require('../../models/timeseries')

async function get (req, res, next) {
  try {
    const { from = Date.now() - 86400000, to = Date.now() } = req.query
    if (req.accepts('text/csv')) {
      const query = await getTimeseries(
        req.params.accessToken,
        req.params.name,
        from,
        to,
        false
      )
      res.setHeader('content-type', 'application/json')
      res.setHeader('content-type', 'text/csv')
      res.write(`timestamp,${req.params.name}\n`)
      res.write(query[0].result)
      return res.end()
    } else if (req.accepts('application/json')) {
      const query = await getTimeseries(
        req.params.accessToken,
        req.params.name,
        from,
        to,
        true
      )
      res.setHeader('content-type', 'application/json')
      return res.send(query[0].result)
    }
  } catch (e) {
    next(e)
  }
}

exports = module.exports = {
  get
}
