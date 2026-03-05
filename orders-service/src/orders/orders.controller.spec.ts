import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { OrderStatus } from './entities/order.entity';

describe('OrdersController', () => {
  let controller: OrdersController;

  const ordersServiceMock = {
    create: jest.fn(),
    changeStatus: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: ordersServiceMock,
        },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
  });

  describe('create', () => {
    it('should delegate order creation to the service', async () => {
      const dto: CreateOrderDto = {
        items: [{ productId: 'product-1', quantity: 2, price: 50 }],
      };
      const expectedOrder = {
        id: 'order-1',
        status: OrderStatus.PENDING,
        totalAmount: 100,
        items: dto.items,
      };

      ordersServiceMock.create.mockResolvedValue(expectedOrder);

      await expect(controller.create(dto)).resolves.toEqual(expectedOrder);
      expect(ordersServiceMock.create).toHaveBeenCalledTimes(1);
      expect(ordersServiceMock.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('changeStatus', () => {
    it('should delegate status change to the service', async () => {
      const dto: ChangeStatusDto = {
        id: '11111111-1111-1111-1111-111111111111',
        status: OrderStatus.PAID,
      };
      const updatedOrder = {
        id: dto.id,
        status: dto.status,
      };

      ordersServiceMock.changeStatus.mockResolvedValue(updatedOrder);

      await expect(controller.changeStatus(dto)).resolves.toEqual(updatedOrder);
      expect(ordersServiceMock.changeStatus).toHaveBeenCalledTimes(1);
      expect(ordersServiceMock.changeStatus).toHaveBeenCalledWith(dto);
    });
  });
});
