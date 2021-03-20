'use strict'

const { fixThingId } = require('../../../../middlewares/fix_ids')
const { checkPermissionsForProperty } = require('../../../../middlewares/authz')

function post (req, res) {
  req.influxDB.count(req.params.thingId, req.params.propertyName, req.body)
}

function get (req, res) {
  req.influxDB.count(req.params.thingId, req.params.propertyName, req.query)
}

module.exports = {
  post: [
    checkPermissionsForProperty,
    fixThingId,
    post
  ],
  get: [
    checkPermissionsForProperty,
    fixThingId,
    get
  ]
}
