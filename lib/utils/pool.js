'use strict'

const env = require('env-var')
const postgres = require('postgres')

const PostgresUrl = env.get('POSTGRES_URL').required(true).asString()

const sql = postgres(PostgresUrl)

exports = module.exports = {
  sql
}
