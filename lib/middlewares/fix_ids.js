'use strict'

function fixThingId(req, res, next) {
    req.params.thingId = req.params.thingId.replace('uri:urn:', '')
    next()
  }

exports = module.exports = {
    fixThingId
}