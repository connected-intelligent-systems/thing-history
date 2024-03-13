# Thing History

The Thing History services provides a unified interface for accessing historical data related to thing properties. This system is built upon the robust foundations of ThingsBoard and Postgres, with integration for Cassandra currently in progress. This architecture ensures that users can efficiently query and manage the historical data of their things, facilitating improved data analysis, reporting, and decision-making capabilities.

## Documentation

The Thing History provides comprehensive documentation in the form of an OpenAPI specification. This specification, available in the `api-doc.yml` file, describes the RESTful API endpoints, request/response formats, and example payloads.

Developers can refer to this documentation to understand how to interact with the Thing History and integrate it into their applications. The OpenAPI specification provides a clear and standardized way to communicate the capabilities and usage of the API.

To get started, please refer to the `api-doc.yml` file for detailed information on the available endpoints and example usage.

## Environment Variables

The following environment variables can be configured for the Thing History service:

* `PORT`: The port on which the Thing History will listen for incoming requests. Default value is `3000`.
* `BASE_PATH`: The base path for the Thing History API. Default value is `/api/history`.
* `POSTGRES_URL`: The URL of the PostgreSQL database. This variable is required for the Thing History to connect to the database.

## Authors

Sebastian Alberternst <sebastian.alberternst@dfki.de>

## License

MIT 

