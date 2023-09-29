'use strict'

require('dotenv').config()
const express = require('express')
const env = require('env-var')
const { HttpError } = require('./lib/utils/http_errors')
const middlewares = require('./lib/middlewares')
const {
  init,
  getTimeseries,
  getLatest,
  getValueFromRow
} = require('./lib/models/timeseries')

const Port = env.get('PORT').default(3000).asIntPositive()

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
 * Entry point fuunction that initializes and runs the server
 */
async function initServer () {
  const app = initExpress()
  await init()

  app.get('/', (req, res) => {
    res.send('OK')
  })

  app.get('/:accessToken/:name', async (req, res) => {
    const { from = Date.now() - 86400000, to = Date.now() } = req.query
    const query = await getTimeseries(
      req.params.accessToken,
      req.params.name,
      from,
      to
    )

    if (req.accepts('text/csv')) {
      res.setHeader('content-type', 'text/csv')
      res.write(`timestamp,${req.params.name}\n`)
      for await (const row of query) {
        const ts = parseInt(row.ts)
        const value = getValueFromRow(row)
        res.write(`${ts},${value}\n`)
      }
      res.end()
    } else {
      res.setHeader('content-type', 'application/json')
      let hasWritten = false
      for await (const row of query) {
        const result = {
          ts: parseInt(row.ts),
          value: getValueFromRow(row)
        }
        if (hasWritten === false) {
          res.write(`[${JSON.stringify(result)}`)
          hasWritten = true
        } else {
          res.write(`,${JSON.stringify(result)}`)
        }
      }
      res.write(']')
      res.end()
    }
  })

  app.get('/:accessToken/:name/latest', async (req, res) => {
    const result = await getLatest(req.params.accessToken, req.params.name)
    res.json(result)
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
