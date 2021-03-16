'use strict'

const {
  InsufficientPermissions,
  InternalServerError
} = require('../../../utils/http_errors')

async function execute (req, res) {
  const permissions = await req.models.access.check({
    resource: `${req.params.thingId}/properties/${req.params.propertyName}`,
    token: req.kauth.grant.access_token.token,
    scopes: ['GET']
  })

  if (permissions === undefined) {
    throw new InsufficientPermissions()
  }

  // fix connctd ids
  req.params.thingId = req.params.thingId.replace('uri:urn:', '')

  try {
    const result = await req.queryInfluxDB(
      req.params.thingId,
      req.params.propertyName,
      req.body.start || req.query.start,
      req.body.stop || req.query.start
    )
    res.setHeader('content-type', 'text/csv')
    res.send(result)
  } catch (e) {
    throw new InternalServerError()
  }
}

async function post (req, res) {
  await execute(req, res)
}

async function get (req, res) {
  await execute(req, res)
}

module.exports = {
  post,
  get
}
