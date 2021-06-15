'use strict'

const fetch = require('node-fetch')
const env = require('env-var')
const formurlencoded = require('form-urlencoded').default
const jwt = require('jsonwebtoken')
const buildQuery = require('../utils/build_query')

const KeycloakHost = env.get('KEYCLOAK_HOST').asString()
const KeycloakRealm = env.get('KEYCLOAK_REALM').asString()
const ResourceClientId = env.get('RESOURCE_CLIENT_ID').asString()
const ResourceClientSecret = env.get('RESOURCE_CLIENT_SECRET').asString()

let accessToken
let refreshToken

/**
 * Checks if a jwt token is expired
 * @param {string} token - jwt access token to check
 */
function isExpired (token) {
  if (token === undefined || Date.now() >= token.content.exp * 1000) {
    return true
  }
  return false
}

/**
 * Decodes both access and refresh token and stores it
 * @param {string} json - answer from authentication
 */
function storeTokens (json) {
  if (json.access_token !== undefined) {
    accessToken = {
      token: json.access_token,
      content: jwt.decode(json.access_token)
    }
  }
  if (json.refresh_token !== undefined) {
    refreshToken = {
      token: json.refresh_token,
      content: jwt.decode(json.refresh_token)
    }
  }
}

/**
 * Generates a PAT token
 */
async function authenticate () {
  const response = await fetch(
    `${KeycloakHost}/auth/realms/${KeycloakRealm}/protocol/openid-connect/token`,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      method: 'POST',
      body: formurlencoded({
        client_id: ResourceClientId,
        client_secret: ResourceClientSecret,
        grant_type: 'client_credentials'
      })
    }
  )

  if (!response.ok) {
    throw Error('Unable to generate pat token')
  }

  storeTokens(await response.json())
}

/**
 * Refreshes a PAT token
 */
async function fetchAccessToken () {
  const response = await fetch(
    `${KeycloakHost}/auth/realms/${KeycloakRealm}/protocol/openid-connect/token`,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      method: 'POST',
      body: formurlencoded({
        client_id: ResourceClientId,
        client_secret: ResourceClientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken.token
      })
    }
  )

  if (!response.ok) {
    throw Error('Unable to generate pat token')
  }

  storeTokens(await response.json())
}

/**
 * Returns a valid access token. Refreshes and authenticates if necessary
 */
async function getAccessToken () {
  if (isExpired(accessToken)) {
    if (isExpired(refreshToken)) {
      await authenticate()
    } else {
      await fetchAccessToken()
    }
  }
  return accessToken.token
}

/**
 * Find resources by name, user and type
 * @param {Object} properties - An object.
 * @param {string} properties.name - Name of the searched resource
 * @param {string} properties.exactName - Name (properties.name) must be exact
 * @param {string} properties.deep - Includes more properties of the resource
 * @param {string} properties.type - Queries a specific resource type
 */
async function find ({ name, exactName, deep, type, matchingUri } = {}) {
  const query = buildQuery({
    name,
    exactName,
    deep,
    type,
    matchingUri
  })
  const response = await fetch(
    `${KeycloakHost}/auth/realms/${KeycloakRealm}/authz/protection/resource_set?${query}`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await getAccessToken()}`
      },
      method: 'GET'
    }
  )

  if (!response.ok) {
    throw new Error('Error fetching resource_set')
  }

  return response.json()
}


exports = module.exports = {
  find
}
