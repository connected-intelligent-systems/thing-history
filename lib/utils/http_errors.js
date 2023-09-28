'use strict'

class HttpError extends Error {
  constructor (status, error, message, details) {
    super(message)
    this._error = error
    this._status = status
    this._details = details
  }

  get error () {
    return this._error
  }

  get status () {
    return this._status
  }

  get details () {
    return this._details
  }
}

class InsufficientPermissions extends HttpError {
  constructor () {
    super(403, 'permissions_insufficient', 'Insufficient permissions')
  }
}

exports = module.exports = {
  HttpError,
  InsufficientPermissions
}
