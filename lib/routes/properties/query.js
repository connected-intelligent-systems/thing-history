'use strict'

const { InsufficientPermissions } = require('../../utils/http_errors')
const models = require('../../models')
const { resource } = require('../../models')

async function getResourceIds(properties) {
  const resources = await Promise.all(properties.map(name => models.resource.find({ name, exactName: true, deep: true })))
  return resources.flat().map(resource => resource._id)
}

async function checkPermissionsForProperties (properties, token) {
  const ids = await getResourceIds(properties)
  const permissions = await models.access.check({
    resource: ids,
    token,
    scopes: ['GET']
  })

  if(permissions === undefined) {
    throw new Error('No permissions to read resource ' + id)
  }
}

async function post (req, res, next) {
  try {
    await checkPermissionsForProperties(req.body.properties, req.kauth.grant.access_token.token)
    req.influxDB.queryProperties(req.body)
  } catch(e) {
    next(new InsufficientPermissions()) 
  }
}

module.exports = {
  post
}
