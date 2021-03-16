'use strict'

const express = require('express')
const env = require('env-var')
const path = require('path')
const openapi = require('express-openapi')
const { HttpError, InvalidOrMissingScope } = require('./lib/utils/http_errors')
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
 * Installs a global error handler.
 * @param {object} app - The express instance
 */
function installErrorHandler (app) {
  app.use((error, req, res, next) => {
    console.log(error)
    // catch our own error instances
    if (error instanceof HttpError) {
      return res.status(error.status).json({
        status: error.status,
        error: error.error,
        message: error.message,
        details: error.details
      })
    }
    // catch unknown errors
    const { message, status, errors } = error
    if (status === undefined || status === 0) {
      return res.status(500).send('Internal server error')
    } else {
      // convert them if they have a status
      res.status(status).json({
        status: status,
        message,
        details: errors
      })
    }
  })
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
            throw new InvalidOrMissingScope()
          }
        } else {
          throw new InvalidOrMissingScope()
        }
      }
    }
  })

  // install the default error handler that handles the custom
  // httperror exception
  installErrorHandler(app)

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
