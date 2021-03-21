

GET /property/{thingId}/{propertyName}/query?from=from&to=to&every=2m&fn=mean&fill=true
GET /property/{thingId}/{propertyName}/count?window

{
    "start": "",
    "stop": "",
    "every": "5m",
    "filters": [
        { "value": 1.0, "func": eq }
    ]
}
