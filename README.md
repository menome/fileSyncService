# File Sync Service

The FSS is a microservice that talks to Minio, RabbitMQ, and Neo4j.

When an update or delete event is thrown by Minio, the FSS picks it up, downloads the file, extracts key information, (fulltext, thumbnails, etc) and updates the graph.

## Example Config
```json
{
  "minio": {
    "endPoint": "minio",
    "port": 9000,
    "secure": false,
    "accessKey": "abcd123",
    "secretKey": "abcd12345",
    "fileBucket": "filestore"
  },
  "neo4j": {
    "enable": true,
    "url": "bolt://neo4j",
    "user": "neo4j",
    "pass": "graphPaper!"
  },
  "rabbit": {
    "enable": true,
    "url": "amqp://rabbitmq:rabbitmq@rabbit:5672?heartbeat=3600",
    "routingKey": "bucketlogs",
    "exchange": "bucketevents",
    "exchangeType": "topic",
    "prefetch": 2
  },
  "rabbit_outgoing": {
    "enable": true,
    "url": "amqp://rabbitmq:rabbitmq@rabbit:5672?heartbeat=3600",
    "routingKey": "fanExchange.added",
    "exchange": "fanExchange",
    "exchangeType": "fanout"
  }
}
```