'use strict'

exports = module.exports = [require('./keycloak'), require('./influxdb'), require('./models'), (req, res, next) => {
    console.log(req.path)
    next()
}]
