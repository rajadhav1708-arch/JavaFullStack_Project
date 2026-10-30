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
      /** Staff only: place the order for a signed-in customer (counter sale). */
      customerUserId?: number;
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

    // Counter sales are rung up by staff but belong to the farmer's account —
    // especially for Khata Credit, which must hit THAT farmer's ledger. Only
    // staff may name another customer; a customer's own request can never
    // redirect an order (or a credit charge) onto someone else's account.
    let orderUserId = user.id;
    if (body.customerUserId !== undefined) {
      if (user.role !== 'admin' && user.role !== 'employee') {
        res.status(403).json({ error: 'FORBIDDEN', message: 'Only shop staff can place an order for another customer.' });
        return;
      }
      if (!Number.isInteger(body.customerUserId) || body.customerUserId < 1) {
        res.status(400).json({ error: 'BAD_REQUEST', message: 'A valid customer is required for a Khata sale.' });
        return;
      }
      const target = await pool!.query<{ id: number }>(
        `SELECT id FROM users WHERE id = $1 AND role = 'customer'`,
        [body.customerUserId]
      );
      if (target.rows.length === 0) {
        res.status(404).json({ error: 'NO_SUCH_USER', message: 'No such customer account.' });
        return;
      }
      orderUserId = target.rows[0].id;
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
      // and the charge cannot disagree. Only an Approved account may buy on
      // credit: Pending, Rejected, Suspended and Closed accounts are refused.
      let khataAccountId: number | null = null;
      if (body.paymentMethod === 'Khata Credit') {
        const account = await client.query<{ id: number; credit_limit: string; outstanding: string; status: string }>(
          `SELECT a.id, a.credit_limit, a.status,
                  COALESCE(SUM(CASE WHEN e.is_debit THEN e.amount ELSE -e.amount END), 0) AS outstanding
           FROM khata_accounts a
           LEFT JOIN khata_entries e ON e.account_id = a.id
           WHERE a.user_id = $1
           GROUP BY a.id`,
          [orderUserId]
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
        if (khata.status !== 'Approved') {
          await client.query('ROLLBACK');
          res.status(403).json({
            error: 'KHATA_NOT_APPROVED',
            message:
              khata.status === 'Pending'
                ? 'Your Khata request is still pending review. Please pay by another method for now.'
                : `Your Khata account is ${khata.status.toLowerCase()}. Please speak to the shop.`,
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
          orderUserId,
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
          `INSERT INTO khata_entries (account_id, entry_type, amount, is_debit, notes, order_id, recorded_by)
           VALUES ($1, 'Purchase', $2, true, $3, $4, $5)
           ON CONFLICT (order_id, entry_type) DO NOTHING`,
          [
            khataAccountId,
            totalAmount,
            `${lines.length} item(s) on Khata Credit (${orderNumber})`,
            orderId,
            user.id,
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

    const client = await pool!.connect();
    try {
      await client.query('BEGIN');
      const current = await client.query<{ id: number; status: string; payment_method: string; total_amount: string }>(
        'SELECT id, status, payment_method, total_amount FROM orders WHERE id = $1 FOR UPDATE',
        [id]
      );
      const order = current.rows[0];
      if (!order) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: 'NOT_FOUND', message: 'No such order.' });
        return;
      }

      if (order.status === 'Cancelled') {
        await client.query('ROLLBACK');
        res.status(409).json({
          error: 'ALREADY_CANCELLED',
          message: 'This order is cancelled and cannot be reopened. Record a new order or a ledger adjustment instead.',
        });
        return;
      }

      if (status === 'Cancelled') {
        // Cancellation must not erase money already booked: the stock goes back
        // and, for a Khata order, a reversing Adjustment is written against the
        // original Purchase in the same transaction. The original entry stays —
        // the ledger remains auditable. The unique (order_id, entry_type)
        // constraint plus this existence check make a repeated cancel idempotent.
        const items = await client.query<{ product_id: string; weight_kg: string; quantity: number }>(
          'SELECT product_id, weight_kg, quantity FROM order_items WHERE order_id = $1',
          [id]
        );
        for (const item of items.rows) {
          await client.query(
            'UPDATE product_variants SET stock = stock + $1 WHERE product_id = $2 AND weight_kg = $3',
            [item.quantity, item.product_id, item.weight_kg]
          );
          await client.query(
            'UPDATE products SET stock_count = stock_count + $1 WHERE id = $2',
            [item.quantity, item.product_id]
          );
        }

        if (order.payment_method === 'Khata Credit') {
          const purchase = await client.query<{ id: number; account_id: number; amount: string; is_debit: boolean }>(
            `SELECT id, account_id, amount, is_debit FROM khata_entries
             WHERE order_id = $1 AND entry_type = 'Purchase'`,
            [id]
          );
          const entry = purchase.rows[0];
          if (entry) {
            await client.query(
              `INSERT INTO khata_entries (account_id, entry_type, amount, is_debit, notes, order_id, recorded_by, reverses_entry_id)
               VALUES ($1, 'Adjustment', $2, $3, $4, $5, $6, $7)
               ON CONFLICT (order_id, entry_type) DO NOTHING`,
              [
                entry.account_id,
                entry.amount,
                !entry.is_debit,
                `Cancellation reversal for order ${order.id}`,
                order.id,
                user.id,
                entry.id,
              ]
            );
          }
        }
      }

      const updated = await client.query<OrderRow>('UPDATE orders SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
      await client.query('COMMIT');

      const itemResult = await pool!.query<ItemRow>('SELECT * FROM order_items WHERE order_id = $1', [id]);
      res.json({ order: toOrder(updated.rows[0], itemResult.rows) });
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
    console.error('[api/orders PATCH]', error);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not update the order status.' });
  }
});
