'use strict'

const express = require('express')
const env = require('env-var')
const { InfluxDB } = require('@influxdata/influxdb-client')
const moment = require('moment')
const Keycloak = require('keycloak-connect')
const checkPermissions = require('./lib/check_permissions')

const KeycloakJsonPath = env
  .get('KEYCLOAK_JSON_PATH')
  .default('./keycloak.json')
  .asString()
const Port = env
  .get('PORT')
  .default(80)
  .asIntPositive()
const Bucket = env
  .get('BUCKET')
  .required()
  .asString()
const InfluxDBToken = env
  .get('INFLUXDB_TOKEN')
  .required()
  .asString()
const InfluxDBUrl = env
  .get('INFLUXDB_URL')
  .required()
  .asString()
const InfluxDBOriganization = env
  .get('INFLUXDB_ORG')
  .required()
  .asString()

const keycloak = new Keycloak({}, KeycloakJsonPath)

/**
 * Binds and listens for connections for the express instance
 * @param {object} app - The express instance
 * @param {number} port - The port to bind the service to
 */
function listen (app, port) {
  return new Promise(resolve => {
    const listener = app.listen(port, () => {
      resolve(listener.address().port)
    })
  })
}

/**
 * Creates a express instance with middlewares
 */
function initExpress () {
  const app = express()
  app.use(express.json())
  app.use(keycloak.middleware())
  return app
}

/* Create the flux query
 * @param {string} thingId - the thing id 
 * @param {string} propertyName - the name of the property
*/
function createQuery(thingId, propertyName, { 
  start, 
  stop = 'now()'
}) {
  return `
from(bucket: "${Bucket}")
|> range(start: ${start}, stop: ${stop})
|> filter(fn: (r) => r["_measurement"] == "property_raw")
|> filter(fn: (r) => r["thingId"] == "${thingId}")
|> filter(fn: (r) => r["propertyId"] == "${propertyName}")  
  `
}

/**
 * Entry point fuunction that initializes and runs the server
 */
async function initServer () {
  const app = initExpress()
  const queryApi = new InfluxDB({url: InfluxDBUrl, token: InfluxDBToken}).getQueryApi(InfluxDBOriganization)

  app.post('/property/:thingId/:propertyName', keycloak.protect(), async (req, res) => {
    const permissions = await checkPermissions({
      resource: `${req.params.thingId}/properties/${req.params.propertyName}`,
      token: req.kauth.grant.access_token.token,
      scopes: [ 'GET' ]
    })

    if(permissions === undefined) {
      return res.status(403).json('Insufficient')
    }

    // fix connctd ids
    req.params.thingId = req.params.thingId.replace('uri:urn:', '')

    if(req.body.start !== undefined) {
      if(moment(req.body.start, moment.ISO_8601).isValid() !== true) {
        return res.status(400).send('Invalid start date')
      }
    } else {
      return res.status(400).send('Missing start date')
    }

    if(req.body.stop !== undefined) {
      if(moment(req.body.stop, moment.ISO_8601).isValid() !== true) {
        return res.status(400).send('Invalid stop date')
      }
    } 

    try {
      const result = await queryApi.queryRaw(createQuery(req.params.thingId, req.params.propertyName, req.body))
      res.setHeader('content-type', 'text/csv');
      res.send(result)
    } catch(e) {
      res.status(500).send('Internal server error')
    }
  })

  return listen(app, Port)
}

const promise = initServer()
  .then(port => {
    console.log(`Started on port ${port}`)
    return port
  })
  .catch(e => {
    console.error(e)
    process.exit()
  })

async function getPort () {
  return promise
}

exports = module.exports = {
  getPort
}
