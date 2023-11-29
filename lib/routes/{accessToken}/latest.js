'use strict'

const { getAllLatest } = require('../../models/timeseries')

async function get (req, res, next) {
  try {
    const result = await getAllLatest(req.params.accessToken, req.query)
    res.json(result)
  } catch (e) {
    next(e)
  }
}

exports = module.exports = {
  get
}
