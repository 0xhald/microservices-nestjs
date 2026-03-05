CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS orders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status       VARCHAR(20)    NOT NULL DEFAULT 'PENDING',
  total_amount NUMERIC(12, 2) NOT NULL,
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_status CHECK (status IN ('PENDING', 'CONFIRMED', 'PAID', 'CANCELLED')),
  CONSTRAINT chk_amount CHECK (total_amount >= 0)
);

CREATE TABLE IF NOT EXISTS order_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID           NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id VARCHAR(100)   NOT NULL,
  quantity   INTEGER        NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_paid ON orders(created_at) WHERE status = 'PAID';
CREATE INDEX IF NOT EXISTS idx_items_order_id ON order_items(order_id);
