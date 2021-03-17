'use strict'

const cors = require('cors')

exports = module.exports = [
  cors(),
  require('./keycloak'),
  require('./influxdb'),
  require('./models')
]
