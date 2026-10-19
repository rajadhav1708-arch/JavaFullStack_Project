import { Router, type Request, type Response } from 'express';
import { isDbConfigured, pool, DbUnavailableError } from '../db';
import { currentUser, type SessionUser } from '../auth';
import type { ProductUnit } from '../../../frontend/src/types';

export const ordersRouter = Router();

const GST_RATE = 0.05; // 5% GST on cattle feed (HSN 2309)
const BULK_DISCOUNT_THRESHOLD = 5000;
const BULK_DISCOUNT_RATE = 0.05;
const EXPRESS_DELIVERY_CHARGE = 250;

const PAYMENT_METHODS = ['UPI', 'Cash on Delivery', 'Khata Credit', 'Netbanking', 'Card'] as const;
const DELIVERY_TYPES = ['Standard Farm Delivery', 'Express Tractor Express', 'Store Pickup'] as const;
const ORDER_STATUSES = ['Placed', 'Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'] as const;

function dbGuard(_req: Request, res: Response, next: () => void): void {
  if (!isDbConfigured || !pool) {
    res.status(503).json({ error: 'DB_DISABLED', message: 'DATABASE_URL is not set.' });
    return;
  }
  next();
}

async function requireUser(req: Request, res: Response): Promise<SessionUser | null> {
  const user = await currentUser(req);
  if (!user) {
    res.status(401).json({ error: 'NOT_AUTHENTICATED', message: 'Sign in to manage orders.' });
    return null;
  }
  return user;
}

function trackingStepFor(status: string): number {
  switch (status) {
    case 'Placed': return 1;
    case 'Confirmed': return 2;
    case 'Packed': return 3;
    case 'Shipped': return 4;
    case 'Out for Delivery': return 5;
    case 'Delivered': return 6;
    default: return 0; // Cancelled
  }
}

interface OrderRow {
  id: number;
  order_number: string;
  user_id: number;
  customer_name: string;
  customer_phone: string;
  customer_village: string;
  subtotal: string;
  discount: string;
  delivery_charge: string;
  tax: string;
  total_amount: string;
  payment_method: (typeof PAYMENT_METHODS)[number];
  payment_status: 'Paid' | 'Pending' | 'Khata Due';
  status: (typeof ORDER_STATUSES)[number];
  delivery_type: (typeof DELIVERY_TYPES)[number];
  shipping_address: unknown;
  estimated_delivery_date: string | null;
  created_at: Date;
}

interface ItemRow {
  order_id: number;
  product_id: string;
  product_name: string;
  brand: string;
  weight_kg: string;
  unit: ProductUnit;
  quantity: number;
  unit_price: string;
  total_price: string;
  image: string | null;
}

function toOrder(row: OrderRow, items: ItemRow[]) {
  return {
    id: `ord-${row.id}`,
    orderNumber: row.order_number,
    date: new Date(row.created_at).toISOString().split('T')[0],
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerVillage: row.customer_village,
    items: items.map((i) => ({
      productId: i.product_id,
      productName: i.product_name,
      brand: i.brand,
      weightKg: Number(i.weight_kg),
      unit: i.unit ?? 'kg',
      quantity: i.quantity,
      unitPrice: Number(i.unit_price),
      totalPrice: Number(i.total_price),
      image: i.image ?? '',
    })),
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    deliveryCharge: Number(row.delivery_charge),
    tax: Number(row.tax),
    totalAmount: Number(row.total_amount),
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    status: row.status,
    deliveryType: row.delivery_type,
    shippingAddress: row.shipping_address,
    estimatedDeliveryDate: row.estimated_delivery_date ?? 'Within 24-36 Hours',
    trackingStepIndex: trackingStepFor(row.status),
  };
}

ordersRouter.get('/orders', dbGuard, async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const isStaff = user.role === 'admin' || user.role === 'employee';
    const orderRows = await (async () => {
      // Staff see the whole shop's orders; a customer sees only their own.
      const client = await pool!.connect();
      try {
        const result = isStaff
          ? await client.query<OrderRow>('SELECT * FROM orders ORDER BY created_at DESC LIMIT 200')
          : await client.query<OrderRow>('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 200', [user.id]);
        return result.rows;
      } finally {
        client.release();
      }
    })();

    if (orderRows.length === 0) {
      res.json({ orders: [] });
      return;
    }

    const ids = orderRows.map((r) => r.id);
    const itemResult = await pool!.query<ItemRow>(
      'SELECT * FROM order_items WHERE order_id = ANY($1::int[])',
      [ids]
    );
    const itemsByOrder = new Map<number, ItemRow[]>();
    for (const item of itemResult.rows) {
      const list = itemsByOrder.get(item.order_id as unknown as number) ?? [];
      list.push(item);
      itemsByOrder.set(item.order_id as unknown as number, list);
    }

    res.json({ orders: orderRows.map((row) => toOrder(row, itemsByOrder.get(row.id) ?? [])) });
  } catch (error) {
    if (error instanceof DbUnavailableError) {
      res.status(503).json({ error: 'DB_DISABLED', message: 'Database is unavailable.' });
      return;
    }
    console.error('[api/orders GET]', error);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not load orders.' });
  }
});

ordersRouter.post('/orders', dbGuard, async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const body = (req.body ?? {}) as {
      items?: { productId?: string; weightKg?: number; quantity?: number; isSubscription?: boolean }[];
      shippingAddress?: Record<string, unknown>;
      paymentMethod?: string;
      deliveryType?: string;
    };

    if (!Array.isArray(body.items) || body.items.length === 0) {
      res.status(400).json({ error: 'BAD_ITEMS', message: 'At least one item is required.' });
      return;
    }
    if (!PAYMENT_METHODS.includes(body.paymentMethod as never)) {
      res.status(400).json({ error: 'BAD_PAYMENT', message: 'Unknown payment method.' });
      return;
    }
    if (!DELIVERY_TYPES.includes(body.deliveryType as never)) {
      res.status(400).json({ error: 'BAD_DELIVERY', message: 'Unknown delivery type.' });
      return;
    }
    const address = body.shippingAddress as { fullName?: string; phone?: string; villageTown?: string } | undefined;
    if (!address?.fullName || !address?.phone || !address?.villageTown) {
      res.status(400).json({ error: 'BAD_ADDRESS', message: 'A complete delivery address is required.' });
      return;
    }

    // Validate and price every line from the database - the client-sent price
    // is never trusted. Duplicates are merged first.
    const wanted = new Map<string, { productId: string; weightKg: number; quantity: number }>();
    for (const raw of body.items) {
      if (typeof raw.productId !== 'string' || typeof raw.weightKg !== 'number' || typeof raw.quantity !== 'number' || !Number.isInteger(raw.quantity) || raw.quantity < 1 || raw.quantity > 500) {
        res.status(400).json({ error: 'BAD_ITEMS', message: 'Each item needs a productId, weightKg and a positive integer quantity.' });
        return;
      }
      const key = `${raw.productId}|${raw.weightKg}`;
      const existing = wanted.get(key);
      if (existing) existing.quantity += raw.quantity;
      else wanted.set(key, { productId: raw.productId, weightKg: raw.weightKg, quantity: raw.quantity });
    }

    const client = await pool!.connect();
    try {
      await client.query('BEGIN');

      let subtotal = 0;
      const lines: { product_id: string; product_name: string; brand: string; weight_kg: number; unit: ProductUnit; quantity: number; unit_price: number; total_price: number; image: string | null }[] = [];

      for (const item of wanted.values()) {
        const variantRows = await client.query<{ price: string; stock: number; name: string; brand: string; image: string | null; unit: ProductUnit }>(
          `SELECT pv.price, pv.stock, pv.unit, p.name, p.brand, p.image
           FROM product_variants pv JOIN products p ON p.id = pv.product_id
           WHERE pv.product_id = $1 AND pv.weight_kg = $2
           FOR UPDATE OF pv`,
          [item.productId, item.weightKg]
        );
        const variant = variantRows.rows[0];
        if (!variant) {
          await client.query('ROLLBACK');
          res.status(404).json({ error: 'NOT_FOUND', message: `Product ${item.productId} (${item.weightKg} kg) no longer exists.` });
          return;
        }
        // The unit comes from the variant, not the request, so a client cannot
        // label a sprayer as kilograms and have it written to the order.
        const pack = `${item.weightKg} ${variant.unit ?? 'kg'}`;
        if (variant.stock < item.quantity) {
          await client.query('ROLLBACK');
          res.status(409).json({ error: 'INSUFFICIENT_STOCK', message: `Only ${variant.stock} pack(s) of ${variant.name} (${pack}) left in stock.` });
          return;
        }
        const unitPrice = Number(variant.price);
        subtotal += unitPrice * item.quantity;
        lines.push({
          product_id: item.productId,
          product_name: variant.name,
          brand: variant.brand,
          weight_kg: item.weightKg,
          unit: variant.unit ?? 'kg',
          quantity: item.quantity,
          unit_price: unitPrice,
          total_price: unitPrice * item.quantity,
          image: variant.image,
        });
      }

      const discount = subtotal > BULK_DISCOUNT_THRESHOLD ? Math.round(subtotal * BULK_DISCOUNT_RATE * 100) / 100 : 0;
      const deliveryCharge = body.deliveryType === 'Express Tractor Express' ? EXPRESS_DELIVERY_CHARGE : 0;
      // GST is computed on the taxable value (after discount, before freight).
      const taxBase = Math.max(0, subtotal - discount);
      const tax = Math.round(taxBase * GST_RATE * 100) / 100;
      const totalAmount = Math.round((taxBase + deliveryCharge + tax) * 100) / 100;

      const paymentStatus = body.paymentMethod === 'Khata Credit' ? 'Khata Due' : body.paymentMethod === 'Cash on Delivery' ? 'Pending' : 'Paid';

      // Credit is the shop's money, so the limit is checked here rather than in
      // the browser. This runs before the order row is written so a rejected
      // order leaves no trace, and it reuses the same transaction so the check
      // and the charge cannot disagree.
      let khataAccountId: number | null = null;
      if (body.paymentMethod === 'Khata Credit') {
        const account = await client.query<{ id: number; credit_limit: string; outstanding: string }>(
          `SELECT a.id, a.credit_limit,
                  COALESCE(SUM(CASE WHEN e.entry_type = 'Purchase' THEN e.amount ELSE -e.amount END), 0) AS outstanding
           FROM khata_accounts a
           LEFT JOIN khata_entries e ON e.account_id = a.id
           WHERE a.user_id = $1
           GROUP BY a.id`,
          [user.id]
        );
        const khata = account.rows[0];
        if (!khata) {
          await client.query('ROLLBACK');
          res.status(403).json({
            error: 'NO_KHATA_ACCOUNT',
            message: 'Khata Credit needs a credit account opened by the shop. Please pay at the counter.',
          });
          return;
        }
        const outstanding = Number(khata.outstanding);
        const limit = Number(khata.credit_limit);
        if (outstanding + totalAmount > limit) {
          await client.query('ROLLBACK');
          res.status(409).json({
            error: 'CREDIT_LIMIT_EXCEEDED',
            message:
              `This order of Rs ${totalAmount} would take the Khata balance to Rs ` +
              `${Math.round((outstanding + totalAmount) * 100) / 100}, over the approved limit of Rs ${limit}.`,
          });
          return;
        }
        khataAccountId = khata.id;
      }

      const insertOrder = await client.query<{ id: number }>(
        `INSERT INTO orders (order_number, user_id, customer_name, customer_phone, customer_village,
           subtotal, discount, delivery_charge, tax, total_amount, payment_method, payment_status,
           status, delivery_type, shipping_address, estimated_delivery_date)
         VALUES ('', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Placed', $12, $13, 'Within 24-36 Hours')
         RETURNING id`,
        [
          user.id,
          address.fullName,
          address.phone,
          address.villageTown,
          subtotal,
          discount,
          deliveryCharge,
          tax,
          totalAmount,
          body.paymentMethod,
          paymentStatus,
          body.deliveryType,
          JSON.stringify(body.shippingAddress),
        ]
      );
      const orderId = insertOrder.rows[0].id;
      const orderNumber = `ORD-${new Date().getFullYear()}-${String(orderId).padStart(4, '0')}`;
      await client.query('UPDATE orders SET order_number = $1 WHERE id = $2', [orderNumber, orderId]);

      for (const line of lines) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, product_name, brand, weight_kg, unit, quantity, unit_price, total_price, image)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [orderId, line.product_id, line.product_name, line.brand, line.weight_kg, line.unit, line.quantity, line.unit_price, line.total_price, line.image]
        );
        await client.query(
          'UPDATE product_variants SET stock = stock - $1 WHERE product_id = $2 AND weight_kg = $3',
          [line.quantity, line.product_id, line.weight_kg]
        );
        // Keep the denormalised headline counter in step so the admin inventory
        // screen does not drift from the per-pack numbers.
        await client.query(
          'UPDATE products SET stock_count = GREATEST(0, stock_count - $1) WHERE id = $2',
          [line.quantity, line.product_id]
        );
      }

      // The charge lands in the ledger in the SAME transaction as the order. If
      // this fails the order rolls back too, so a farmer is never billed on the
      // Khata for goods that were never committed to stock. The unique index on
      // (order_id, entry_type) makes a retried checkout idempotent here.
      if (khataAccountId !== null) {
        await client.query(
          `INSERT INTO khata_entries (account_id, entry_type, amount, notes, order_id)
           VALUES ($1, 'Purchase', $2, $3, $4)
           ON CONFLICT (order_id, entry_type) DO NOTHING`,
          [
            khataAccountId,
            totalAmount,
            `${lines.length} item(s) on Khata Credit (${orderNumber})`,
            orderId,
          ]
        );
      }

      await client.query('COMMIT');

      const orderRow = (await client.query<OrderRow>('SELECT * FROM orders WHERE id = $1', [orderId])).rows[0];
      const itemRows = (await client.query<ItemRow>('SELECT * FROM order_items WHERE order_id = $1', [orderId])).rows;
      res.status(201).json({ order: toOrder(orderRow, itemRows) });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof DbUnavailableError) {
      res.status(503).json({ error: 'DB_DISABLED', message: 'Database is unavailable.' });
      return;
    }
    console.error('[api/orders POST]', error);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not place the order.' });
  }
});

ordersRouter.patch('/orders/:id/payment', dbGuard, async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    // Owner confirms money received: COD at doorstep, UPI/card online, or
    // credit approval for Khata orders. Only after this does the customer's
    // bill unlock - before it the order's only record is the request.
    if (user.role !== 'admin' && user.role !== 'employee') {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Only the shop owner can confirm payment.' });
      return;
    }

    const id = Number(req.params.id);
    const paymentStatus = (req.body ?? {}).paymentStatus;
    if (!Number.isInteger(id) || !['Paid', 'Pending', 'Khata Due'].includes(paymentStatus)) {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'A valid order id and payment status are required.' });
      return;
    }

    const updated = await pool!.query<OrderRow>(
      'UPDATE orders SET payment_status = $1 WHERE id = $2 RETURNING *',
      [paymentStatus, id]
    );
    if (updated.rows.length === 0) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'No such order.' });
      return;
    }

    const itemResult = await pool!.query<ItemRow>('SELECT * FROM order_items WHERE order_id = $1', [id]);
    res.json({ order: toOrder(updated.rows[0], itemResult.rows) });
  } catch (error) {
    console.error('[api/orders PATCH payment]', error);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not update payment.' });
  }
});

ordersRouter.patch('/orders/:id/status', dbGuard, async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    // Server-side role check: the browser cannot appoint itself admin.
    if (user.role !== 'admin' && user.role !== 'employee') {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Only shop staff can update order status.' });
      return;
    }

    const id = Number(req.params.id);
    const status = (req.body ?? {}).status;
    if (!Number.isInteger(id) || !ORDER_STATUSES.includes(status)) {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'A valid order id and status are required.' });
      return;
    }

    const updated = await pool!.query<OrderRow>(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (updated.rows.length === 0) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'No such order.' });
      return;
    }
    res.json({ order: toOrder(updated.rows[0], []) });
  } catch (error) {
    console.error('[api/orders PATCH]', error);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not update the order.' });
  }
});
