import { Controller } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateOrderDto } from './dto/create-order.dto';
import { ChangeStatusDto } from './dto/change-status.dto';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @MessagePattern('orders.create')
  create(@Payload() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  @MessagePattern('orders.status.change')
  changeStatus(@Payload() dto: ChangeStatusDto) {
    return this.ordersService.changeStatus(dto);
  }
}
