import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderItem } from './entities/order-item.entity';

@Injectable()
export class OrdersRepository {
  constructor(
    @InjectRepository(Order)
    private readonly repo: Repository<Order>,
    private readonly dataSource: DataSource,
  ) {}

  async createWithItems(dto: CreateOrderDto): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      const order = manager.create(Order, {
        status: OrderStatus.PENDING,
        totalAmount: dto.items.reduce((s, i) => s + i.price * i.quantity, 0),
      });
      const saved = await manager.save(order);
      const items = dto.items.map((i) =>
        manager.create(OrderItem, {
          orderId: saved.id,
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.price,
        }),
      );
      await manager.save(items);
      return saved;
    });
  }

  async findOneOrFailById(id: string): Promise<Order> {
    return this.repo.findOneOrFail({ where: { id }, relations: ['items'] });
  }

  async save(order: Order): Promise<Order> {
    return this.repo.save(order);
  }
}
