'use strict'

const { getLatestValues } = require('../../models/timeseries')

async function get (req, res, next) {
  try {
    const result = await getLatestValues(req.params.accessToken, req.query)
    res.json(result)
  } catch (e) {
    next(e)
  }
}

exports = module.exports = {
  get
}
