# Microservices with NestJS
## Architecture
The system is divided into four independent microservices:
1. orders-service: Creates and manages orders.
2. payments-service: Registers and confirms payments.
3. notifications-service: Send notifications to the user.
4. api-gateway: Entrypoint to the architecture.

## Communication between services
The main form of communication between user and application is through api-gateway using a REST API which manages routing, auth and rate-limiting.

Communication between services is done through NATS. In this way the services don't need to respond sincronously and I can manage downtime in any service.

The api-gateway communicates to the orders-service using the request-reply pattern in a sincronously way. Then orders-service published the events while the rest of services subscribe to them.

Subjects: order.created, order.paid

## Databases
Using the Database per Service architecture is possible to maintain the independence of each service and their own data needs, including scalability and sharding if required.

## Fault tolerance
In case a fault is experience in one of the services NATS JetStream keeps the events stored for the service to re-read them as needed. MaxDeliver is set to keep messages in JetStream in case it can't be received by the service. A retrial policy is set with exponential backoff to prevent flooding the system with requests.

## Justification of choices
The usage of NestJS and NATS was implemented in order to learn these two technologies. Docker being the tool of choice to allow me to test everything in a platform as close to what a production server must be.

## SQL
1. Query to retrieve total orders grouped by day.
```sql
SELECT
    DATE(created_at) as day,
    COUNT(*) as total_orders
    FROM orders
    GROUP BY day
    ORDER BY day desc
```
2. Query to retrieve total amount grouped by day.
```sql
SELECT
    DATE(created_at) as day,
    SUM(total_amount) as total
    COUNT(*) as total_orders
    FROM orders
    WHERE status = 'PAID'
    GROUP BY day
    ORDER BY day desc
```
3. Query to retrieve paid orders in a range of dates.
```sql
SELECT
    id,
    total_amount,
    created_at
    FROM   orders
    WHERE  status     = 'PAID'
    AND  created_at >= xxx::timestamptz
    AND  created_at <  xxx::timestamptz
    ORDER BY created_at DESC;
```
4. What indices would you use and why?
I would create indices on created_at, status, paid and order_id. Since those would be the most use for reporting and monitoring the orders.
5. What are the differences between PostgreSQL and SQL Server?
The obvious difference is between the license of each software and their respective "owner". Each manage support SQL standard but with some differences, for example in the creation of uuids.

## Linux debugging
There are different commands we can use to check memory and cpu usage. For example: top and ps aux allow to see active processes.

For memory usage the usual command is free -h.

For troubleshooting Docker containers the commands are: 
* docker logs *container_name*
* docker inspect *container_name*
* To get a terminal docker exec -it _container_name_ sh