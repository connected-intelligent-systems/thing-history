'use strict'

const { createRemoteJWKSet, jwtVerify } = require('jose')
const env = require('env-var')
const { InvalidOrMissingToken } = require('../utils/http_errors')

const KeycloakHost = env.get('KEYCLOAK_HOST').asString()
const KeycloakRealm = env.get('KEYCLOAK_REALM').asString()

const jwks = createRemoteJWKSet(
  new URL(
    `${KeycloakHost}/realms/${KeycloakRealm}/protocol/openid-connect/certs`
  )
)

function extractTokenFromHeader (req) {
  if (req.headers.authorization !== undefined) {
    const [type, token] = req.headers.authorization.split(' ')
    return type === 'Bearer' ? token : undefined
  }
}

exports = module.exports = async function (req, res, next) {
  const token = extractTokenFromHeader(req)
  if (!token) {
    return next(new InvalidOrMissingToken())
  }

  try {
    const decodedToken = await jwtVerify(token, jwks)

    req.auth = {
      access_token: {
        token,
        content: decodedToken.payload
      }
    }

    next()
  } catch (e) {
    return next(new InvalidOrMissingToken())
  }
}
