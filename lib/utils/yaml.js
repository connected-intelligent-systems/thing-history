'use strict'

const yaml = require('js-yaml')
const fs = require('fs')

/**
 * Reads a yaml file
 * @param {string} filename - filename of the yaml file
 * @returns {string} - parsed yaml file
 */
function readYaml (filename) {
  return yaml.safeLoad(fs.readFileSync(filename, 'utf8'))
}

exports = module.exports = {
  readYaml
}
