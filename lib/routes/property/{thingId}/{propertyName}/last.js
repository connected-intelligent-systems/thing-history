'use strict'

const { fixThingId } = require('../../../../middlewares/fix_ids')
const { checkPermissionsForProperty } = require('../../../../middlewares/authz')

function get (req, res) {
  req.influxDB.last(req.params.thingId, req.params.propertyName, req.query)
}

module.exports = {
  get: [checkPermissionsForProperty, fixThingId, get]
}
