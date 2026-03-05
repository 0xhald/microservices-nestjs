import { IsEnum, IsUUID } from 'class-validator';
import { OrderStatus } from '../entities/order.entity';

export class ChangeStatusDto {
  @IsUUID()
  id: string;

  @IsEnum(OrderStatus)
  status: OrderStatus;
}
