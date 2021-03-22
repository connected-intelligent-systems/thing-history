'use strict'

const { fixThingId } = require('../../../middlewares/fix_ids')
const { checkPermissionsForProperty } = require('../../../middlewares/authz')

function post (req, res) {
  req.influxDB.query(req.params.thingId, req.params.propertyName, req.body)
}

module.exports = {
  post: [checkPermissionsForProperty, fixThingId, post]
}
