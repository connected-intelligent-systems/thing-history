'use strict'

function fixThingId (req, res, next) {
  req.params.thingId = req.params.thingId.replace('uri:urn:', '')
  req.params.thingId = req.params.thingId.replace('https://zuse.icas.fh-dortmund.de/ict-gw/v1/things/', '')
  next()
}

exports = module.exports = {
  fixThingId
}
