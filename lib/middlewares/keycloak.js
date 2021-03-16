'use strict'

const env = require('env-var')
const Keycloak = require('keycloak-connect')

const KeycloakJsonPath = env
  .get('KEYCLOAK_JSON_PATH')
  .default('./keycloak.json')
  .asString()
const keycloak = new Keycloak({}, KeycloakJsonPath)

exports = module.exports = keycloak.middleware()