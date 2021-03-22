'use strict'

const { fixThingId } = require('../../../../middlewares/fix_ids')
const {
  checkPermissionsForProperty
} = require('../../../../middlewares/authz')

function post (req, res, next) {
  try {
    req.influxDB.count(req.params.thingId, req.params.propertyName, req.body)
  } catch (e) {
    next(e)
  }
}

module.exports = {
  post: [checkPermissionsForProperty, fixThingId, post]
}
