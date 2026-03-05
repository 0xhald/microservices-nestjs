import { Module } from '@nestjs/common';

import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrdersRepository } from './orders.repository';

const dbPort = Number.parseInt(process.env.DB_PORT ?? '5432', 10);

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number.isNaN(dbPort) ? 5432 : dbPort,
      username: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'orders',
      entities: [Order, OrderItem],
      synchronize: false,
    }),
    ClientsModule.register([
      {
        name: 'ORDERS_SERVICE',
        transport: Transport.NATS,
        options: {
          servers: [process.env.NATS_SERVER ?? 'nats://localhost:4222'],
        },
      },
    ]),
    TypeOrmModule.forFeature([Order, OrderItem]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository],
})
export class OrdersModule {}
