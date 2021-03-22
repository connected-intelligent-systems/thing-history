'use strict'

const { InsufficientPermissions } = require('../utils/http_errors')

async function checkPermissionsForProperty (req, res, next) {
  const permissions = await req.models.access.check({
    resource: `${req.params.thingId}/properties/${req.params.propertyName}`,
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
