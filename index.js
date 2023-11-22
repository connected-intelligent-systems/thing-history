'use strict'

require('dotenv').config()
const express = require('express')
const openapi = require('express-openapi')
const swagger = require('swagger-ui-express')
const env = require('env-var')
const path = require('path')
const { HttpError } = require('./lib/utils/http_errors')
const middlewares = require('./lib/middlewares')
const { readYaml } = require('./lib/utils/yaml')
const {
  init
} = require('./lib/models/timeseries')

const Port = env.get('PORT').default(3000).asIntPositive()

const BasePath = env
  .get('BASE_PATH')
  .default('/api/history')
  .required()
  .asString()

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
  apiDoc.servers = [
    {
      url: BasePath
    }
  ]
  return {
    ...apiDoc,
    'x-express-openapi-validation-strict': true
  }
}

/**
 * Install Swagger-Ui routes
 */
function installSwaggerUi (app) {
  app.use(
    `${BasePath}/swagger-ui`,
    swagger.serve,
    swagger.setup(null, {
      swaggerOptions: {
        url: `${BasePath}/.openapi`
      }
    })
  )
}

/**
 * Installs a global error handler.
 * @param {object} app - The express instance
 */
function installErrorHandler (app) {
  app.use((error, req, res, next) => {
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
 * Entry point function that initializes and runs the server
 */
async function initServer () {
  const app = initExpress()
  await init()

  const apiDoc = generateApiDoc()

  installSwaggerUi(app)

  const framework = await openapi.initialize({
    apiDoc,
    app,
    paths: path.resolve(__dirname, './lib/routes/'),
    docsPath: '/.openapi',
    consumesMiddleware: {
      'application/json': express.json()
    }
  })

  app.get('/', (req, res) => {
    res.send('OK')
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
