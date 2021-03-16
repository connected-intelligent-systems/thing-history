'use strict'

const models = require('../models')

exports = module.exports = (req, res, next) => {
  req.models = models
  next()
}
