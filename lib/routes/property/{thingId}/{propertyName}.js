'use strict'

async function execute (req, res) {
  const permissions = await req.models.access.check({
    resource: `${req.params.thingId}/properties/${req.params.propertyName}`,
    token: req.kauth.grant.access_token.token,
    scopes: ['GET']
  })

  if (permissions === undefined) {
    return res.status(403).json({
      error: 'insufficient_permissions',
      status: 403
    })
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
    return res.status(500).json({
      error: 'internal_server_error',
      status: 500
    })
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
