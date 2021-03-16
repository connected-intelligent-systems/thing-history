'use strict'

const fetch = require('node-fetch')
const env = require('env-var')
const jwt = require('jsonwebtoken')
const queryString = require('query-string')

const KeycloakHost = env.get('KEYCLOAK_HOST').asString()
const KeycloakRealm = env.get('KEYCLOAK_REALM').asString()
const ResourceServerAudience = env.get('RESOURCE_SERVER_AUDIENCE').asString()

/**
 * Build the scopes part of the permission parameter
 */
function buildScopes (scopes) {
  if (scopes !== undefined) {
    return `${scopes.join(',')}`
  } else {
    return ''
  }
}

/**
 * Build the permission parameter for the policy enforcer
 */
function buildPermission (resource, scopes) {
  // are there multiple resources to check
  if (Array.isArray(resource)) {
    return resource.map((r, index) => {
      // are there multiple scopes ?
      if (scopes !== undefined && Array.isArray(scopes[0])) {
        return `${r}#${buildScopes(scopes[index])}`
      }
      return `${r}#${buildScopes(scopes)}`
    })
  } else if (resource !== undefined) {
    return `${resource}#${buildScopes(scopes)}`
  } else {
    if (scopes !== undefined) {
      return `#${buildScopes(scopes)}`
    }
    // if nothing is specified return undefined
  }
}

/**
 * Check if a permission is granted
 */
async function check ({
  resource,
  scopes,
  token,
  resourceType,
  namesOnly
} = {}) {
  const body = queryString.stringify({
    audience: ResourceServerAudience,
    grant_type: 'urn:ietf:params:oauth:grant-type:uma-ticket',
    permission: buildPermission(resource, scopes),
    response_include_resource_name: true
  })
  const response = await fetch(
    `${KeycloakHost}/auth/realms/${KeycloakRealm}/protocol/openid-connect/token`,
    {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Bearer ${token}`
      }
    }
  )

  if (response.ok) {
    const json = await response.json()
    const authzToken = jwt.decode(json.access_token)
    let permissions = authzToken.authorization.permissions
    if (resourceType !== undefined) {
      permissions = permissions.filter(permission => {
        if (permission.claims !== undefined) {
          if (permission.claims['resourceType'] !== undefined) {
            return permission.claims['resourceType'][0] === resourceType
          }
        }
        return false
      })
    }
    if (namesOnly === true) {
      permissions = permissions.map(permission => permission.rsname)
    }
    return permissions
  }
}

exports = module.exports = check