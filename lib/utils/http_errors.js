'use strict'

/**
 * Represents an HTTP error.
 * @class
 * @extends Error
 */
class HttpError extends Error {
  constructor (status, error, message, details) {
    super(message)
    this._error = error
    this._status = status
    this._details = details
  }

  /**
   * Get the error code associated with the HTTP error.
   * @returns {string} The error code.
   */
  get error () {
    return this._error
  }

  /**
   * Get the HTTP status code of the error.
   * @returns {number} The HTTP status code.
   */
  get status () {
    return this._status
  }

  /**
   * Get additional details about the error.
   * @returns {object} The error details.
   */
  get details () {
    return this._details
  }
}

/**
 * Represents an HTTP error for insufficient permissions.
 * @extends HttpError
 */
class InsufficientPermissions extends HttpError {
  constructor () {
    super(403, 'permissions_insufficient', 'Insufficient permissions')
  }
}

exports = module.exports = {
  HttpError,
  InsufficientPermissions
}
