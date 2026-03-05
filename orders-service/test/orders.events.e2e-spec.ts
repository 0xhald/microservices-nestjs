import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { connect, NatsConnection, Subscription } from 'nats';
import { Client as PgClient } from 'pg';

type OrderPayload = {
  id: string;
  status: 'PENDING' | 'CONFIRMED' | 'PAID' | 'CANCELLED';
  totalAmount?: string | number;
};

type EventEnvelope = {
  pattern?: string;
  data?: OrderPayload;
};

const natsServer = process.env.E2E_NATS_SERVER ?? 'nats://127.0.0.1:14222';
const dbHost = process.env.E2E_DB_HOST ?? '127.0.0.1';
const dbPort = Number.parseInt(process.env.E2E_DB_PORT ?? '15432', 10);
const dbUser = process.env.E2E_DB_USER ?? 'postgres';
const dbPassword = process.env.E2E_DB_PASSWORD ?? 'postgres';
const dbName = process.env.E2E_DB_NAME ?? 'orders';

function waitForEvent(
  sub: Subscription,
  timeoutMs = 5000,
): Promise<EventEnvelope | OrderPayload> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for event on subject ${sub.getSubject()}`));
    }, timeoutMs);

    const it = (async () => {
      for await (const msg of sub) {
        clearTimeout(timeout);
        const decoded = JSON.parse(msg.string()) as EventEnvelope | OrderPayload;
        resolve(decoded);
        break;
      }
    })();

    void it.catch((error: unknown) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

function extractOrderPayload(
  payload: EventEnvelope | OrderPayload,
): OrderPayload {
  if ('data' in payload && payload.data) {
    return payload.data;
  }
  return payload as OrderPayload;
}

describe('Orders events (e2e, real NATS + Postgres)', () => {
  let client: ClientProxy;
  let natsConn: NatsConnection;
  let db: PgClient;

  beforeAll(async () => {
    jest.setTimeout(30000);

    client = ClientProxyFactory.create({
      transport: Transport.NATS,
      options: { servers: [natsServer] },
    });
    await client.connect();

    natsConn = await connect({ servers: natsServer });

    db = new PgClient({
      host: dbHost,
      port: Number.isNaN(dbPort) ? 5432 : dbPort,
      user: dbUser,
      password: dbPassword,
      database: dbName,
    });
    await db.connect();
  });

  beforeEach(async () => {
    await db.query('DELETE FROM order_items');
    await db.query('DELETE FROM orders');
  });

  afterAll(async () => {
    if (db) {
      await db.end();
    }
    if (natsConn) {
      await natsConn.close();
    }
    if (client) {
      await client.close();
    }
  });

  it('creates an order and emits order.created', async () => {
    const createdSub = natsConn.subscribe('order.created');
    const createdEventPromise = waitForEvent(createdSub);

    const dto = {
      items: [
        { productId: 'product-1', quantity: 2, price: 25 },
        { productId: 'product-2', quantity: 1, price: 10.5 },
      ],
    };

    const createdOrder = await firstValueFrom(client.send('orders.create', dto));
    const createdEvent = extractOrderPayload(await createdEventPromise);
    createdSub.unsubscribe();

    expect(createdOrder).toMatchObject({
      id: expect.any(String),
      status: 'PENDING',
      totalAmount: 60.5,
    });
    expect(createdEvent).toMatchObject({
      id: createdOrder.id,
      status: 'PENDING',
      totalAmount: 60.5,
    });

    const orderRow = await db.query(
      'SELECT id, status, total_amount FROM orders WHERE id = $1',
      [createdOrder.id as string],
    );
    expect(orderRow.rowCount).toBe(1);
    expect(orderRow.rows[0]).toEqual({
      id: createdOrder.id,
      status: 'PENDING',
      total_amount: '60.50',
    });

    const itemsRow = await db.query(
      'SELECT COUNT(*)::int AS count FROM order_items WHERE order_id = $1',
      [createdOrder.id as string],
    );
    expect(itemsRow.rows[0].count).toBe(2);
  });

  it('changes status to PAID and emits order.paid', async () => {
    const createdOrder = await firstValueFrom(
      client.send('orders.create', {
        items: [{ productId: 'product-3', quantity: 1, price: 99.99 }],
      }),
    );

    const paidSub = natsConn.subscribe('order.paid');
    const paidEventPromise = waitForEvent(paidSub);

    const updatedOrder = await firstValueFrom(
      client.send('orders.status.change', {
        id: createdOrder.id as string,
        status: 'PAID',
      }),
    );
    const paidEvent = extractOrderPayload(await paidEventPromise);
    paidSub.unsubscribe();

    expect(updatedOrder).toMatchObject({
      id: createdOrder.id,
      status: 'PAID',
    });
    expect(paidEvent).toMatchObject({
      id: createdOrder.id,
      status: 'PAID',
    });

    const orderRow = await db.query(
      'SELECT id, status FROM orders WHERE id = $1',
      [createdOrder.id as string],
    );
    expect(orderRow.rowCount).toBe(1);
    expect(orderRow.rows[0]).toEqual({
      id: createdOrder.id,
      status: 'PAID',
    });
  });
});
