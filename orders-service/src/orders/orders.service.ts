import { Inject, Injectable } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ChangeStatusDto } from './dto/change-status.dto';
import { OrderStatus } from './entities/order.entity';
import { OrdersRepository } from './orders.repository';
import { EntityNotFoundError } from 'typeorm';

@Injectable()
export class OrdersService {
  constructor(
    @Inject('ORDERS_SERVICE') private readonly client: ClientProxy,
    private readonly ordersRepo: OrdersRepository,
  ) {}

  async create(dto: CreateOrderDto) {
    try {
      const order = await this.ordersRepo.createWithItems(dto);
      this.client.emit('order.created', order); // fire-and-forget
      return order;
    } catch {
      throw new RpcException({
        code: 'ORDER_CREATE_FAILED',
        message: 'Failed to create order',
      });
    }
  }

  async changeStatus(dto: ChangeStatusDto) {
    try {
      const order = await this.ordersRepo.findOneOrFailById(dto.id);
      order.status = dto.status;
      const updated = await this.ordersRepo.save(order);
      if (dto.status === OrderStatus.PAID) {
        this.client.emit('order.paid', updated);
      }
      return updated;
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        throw new RpcException({
          code: 'ORDER_NOT_FOUND',
          message: `Order ${dto.id} was not found`,
        });
      }
      throw new RpcException({
        code: 'ORDER_STATUS_UPDATE_FAILED',
        message: 'Failed to update order status',
      });
    }
  }
}
