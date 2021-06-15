'use strict'

function buildQuery (parameters) {
  return Object.keys(parameters)
    .filter(k => parameters[k] !== undefined)
    .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(parameters[k]))
    .join('&')
}

exports = module.exports = buildQuery
