'use strict'

const env = require('env-var')
const { Pool } = require('pg')

const PostgresUrl = env.get('POSTGRES_URL').required(true).asString()

const pool = new Pool({
  connectionString: PostgresUrl
})

exports = module.exports = {
  pool
}
