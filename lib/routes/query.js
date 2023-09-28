'use strict'

const env = require('env-var')
const {
  InsufficientPermissions,
  InternalServerError
} = require('../utils/http_errors')
const cassandra = require('cassandra-driver')

const RegistryUrl = env
  .get('REGISTRY_URL')
  .default('http://localhost:8080/registry')
  .required()
  .asString()

const CassandraPartition = env
  .get('CASSANDRA_PARTITION')
  .default('1688169600000')
  .required()
  .asIntPositive()

const CassandraContactPoints = env
  .get('CASSANDRA_CONTACT_POINTS')
  .default('localhost')
  .required()
  .asArray()

const CassandraKeyspace = env
  .get('CASSANDRA_KEYSPACE')
  .default('thingsboard')
  .required()
  .asString()

const CassandraUsername = env
  .get('CASSANDRA_USERNAME')
  .default('cassandra')
  .required()
  .asString()

const CassandraPassword = env
  .get('CASSANDRA_PASSWORD')
  .default('cassandra-secret')
  .required()
  .asString()

const client = new cassandra.Client({
  contactPoints: CassandraContactPoints,
  localDataCenter: 'datacenter1',
  credentials: { username: CassandraUsername, password: CassandraPassword },
  keyspace: CassandraKeyspace
})

async function checkPermissionsForThings (thingIds, token) {
  const response = await fetch(
    `${RegistryUrl}/permissions/eval?` +
      new URLSearchParams({
        thing_id: thingIds,
        scope: 'history'
      }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    }
  )

  if (!response.ok) {
    throw InternalServerError()
  }

  return response.json()
}

function getValueFromRow (row) {
  for (const type of ['bool_v', 'dbl_v', 'json_v', 'long_v', 'str_v']) {
    if (row[type] !== null) {
      return row[type]
    }
  }
}

async function queryData (entityId, key, res) {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM thingsboard.ts_kv_cf WHERE entity_id=? AND key=? AND entity_type='DEVICE' AND partition=${CassandraPartition};`
    client.eachRow(
      query,
      [entityId, key],
      function (_, row) {
        res.write(
          `${row.ts},urn:uri:${row.entity_id}/properties/${
            row.key
          },${getValueFromRow(row)}\n`
        )
      },
      function (err) {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      }
    )
  })
}

async function get (req, res, next) {
  try {
    const { property: properties } = req.query
    const propertyIds = properties
      .map((property) =>
        property.match(/^(urn:[a-z0-9][a-z0-9-]{0,31}:(.*))\/properties\/(.*)$/)
      )
      .filter(Boolean)
    const thingIds = await checkPermissionsForThings(
      propertyIds.map((p) => p[1]),
      req.auth.access_token.token
    )

    // TODO: validate propertyName?

    res.setHeader('Content-Type', 'text/csv')
    res.write('timestamp,property_id,value\n')

    await Promise.all(
      propertyIds
        .filter((p) => thingIds.includes(p[1]))
        .map(([, , entityId, key]) => queryData(entityId, key, res))
    )

    res.status(200).end()
  } catch (e) {
    next(new InsufficientPermissions())
  }
}

module.exports = {
  get
}
