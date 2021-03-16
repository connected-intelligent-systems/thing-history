'use strict'

const express = require('express')
const env = require('env-var')
const path = require('path')
const openapi = require('express-openapi')
const { readYaml } = require('./lib/utils/yaml')
const middlewares = require('./lib/middlewares')

const Port = env.get('PORT').default(80).asIntPositive()

/**
 * Binds and listens for connections for the express instance
 * @param {object} app - The express instance
 * @param {number} port - The port to bind the service to
 */
function listen (app, port) {
  return new Promise((resolve) => {
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
  app.use(middlewares)
  return app
}

/**
 * Creates the openapi documentation from the api-doc.yml
 */
function generateApiDoc () {
  const apiDoc = readYaml(path.join(__dirname, 'api-doc.yml'))
  if (process.env.production === undefined) {
    apiDoc.servers.push({
      url: 'http://localhost:9221/',
      description: 'Local development server'
    })
  }
  return {
    ...apiDoc,
    'x-express-openapi-validation-strict': true
  }
}

/**
 * Entry point fuunction that initializes and runs the server
 */
async function initServer () {
  const app = initExpress()
  const apiDoc = generateApiDoc()

  openapi.initialize({
    apiDoc,
    app,
    paths: path.resolve(__dirname, './lib/routes/'),
    exposeApiDocs: true,
    docsPath: '/.openapi',
    consumesMiddleware: {
      'application/json': express.json()
    },
    securityHandlers: {
      auth: (req, scopes) => {
        if (req.kauth && req.kauth.grant) {
          const tokenScopes = req.kauth.grant.access_token.content.scope.split(
            ' '
          )
          if (scopes.every((r) => tokenScopes.includes(r))) {
            return true
          } else {
            // throw new InvalidOrMissingScope()
          }
        }
        // throw new InvalidOrMissingToken()
      }
    }
  })

  return listen(app, Port)
}

const promise = initServer()
  .then((port) => {
    console.log(`Started on port ${port}`)
    return port
  })
  .catch((e) => {
    console.error(e)
    process.exit()
  })

async function getPort () {
  return promise
}

exports = module.exports = {
  getPort
}
