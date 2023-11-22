'use strict'

const { getLatest } = require("../../../models/timeseries")

async function get(req, res) {
    const result = await getLatest(req.params.accessToken, req.params.name)
    res.json(result)
}

exports = module.exports = {
    get
}