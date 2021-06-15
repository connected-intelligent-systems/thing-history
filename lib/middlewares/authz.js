'use strict'

const { InsufficientPermissions } = require('../utils/http_errors')

async function checkPermissionsForProperty (req, res, next) {
  const id = `${req.params.thingId}/properties/${req.params.propertyName}`
  const affordances = await req.models.resource.find({ name: id, exactName: false, deep: true })
  const permissions = await req.models.access.check({
    resource: affordances.map(a => a._id),
    token: req.kauth.grant.access_token.token,
    scopes: ['GET']
  })

  if (permissions === undefined) {
    next(new InsufficientPermissions())
  } else {
    next()
  }
}

exports = module.exports = {
  checkPermissionsForProperty
}
