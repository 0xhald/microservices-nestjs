# Microservices with NestJS
## Architecture
The system is divided into four independent microservices:
1. orders-service: Creates and manages orders.
2. payments-service: Registers and confirms payments.
3. notifications-service: Send notifications to the user.
4. api-gateway: Entrypoint to the architecture.

(TODO: add image here)

## Communication between services
The main form of communication between user and application is through api-gateway using a REST API which manages routing, auth and rate-limiting.

Communication between services is done through NATS. In this way the services don't need to respond sincronously and I can manage downtime in any service.

The api-gateway communicates to the orders-service using the request-reply pattern in a sincronously way. Then orders-service published the events while the rest of services subscribe to them.

Subjects: (TODO: write subjects here)

## Databases
Using the Database per Service architecture is possible to maintain the independence of each service and their own data needs, including scalability and sharding if required.

## Fault tolerance
In case a fault is experience in one of the services NATS JetStream keeps the events stored for the service to re-read them as needed.

MaxDeliver is set to keep messages in JetStream in case it can't be received by the service.

A retrial policy is set with exponential backoff to prevent flooding the system with requests.

## Justification of choices
The usage of NestJS and NATS was implemented in order to learn these two technologies. Docker being the tool of choice to allow me to test everything in a platform as close to what a production server must be.