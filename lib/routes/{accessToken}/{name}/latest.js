'use strict'

const { getLatestValue } = require('../../../models/timeseries')

async function get (req, res, next) {
  try {
    const result = await getLatestValue(
      req.params.accessToken,
      req.params.name,
      req.query
    )
    res.json(result)
  } catch (e) {
    next(e)
  }
}

exports = module.exports = {
  get
}
