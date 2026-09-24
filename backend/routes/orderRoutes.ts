import { Router, Request, Response } from 'express';
import { query, getOne, execute } from '../db.ts';
import { optionalAuthMiddleware } from '../middleware/auth.ts';

const router = Router();

// Place a new order
router.post('/', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const {
      buyerName,
      buyerPhone,
      buyerPincode,
      buyerAddress,
      items,
      paymentMethod = 'cod',
      onlineDetails
    } = req.body;

    // 1. Validation
    if (!buyerName || !buyerPhone || !buyerPincode || !buyerAddress) {
      return res.status(400).json({ error: 'Please provide full name, phone number, pincode, and delivery address' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    const payMethodClean = paymentMethod === 'online' ? 'online' : 'cod';
    let txnId: string | null = null;
    let paymentStatus = 'pending';

    if (payMethodClean === 'online') {
      if (onlineDetails?.type === 'upi' && !onlineDetails.upiId) {
        return res.status(400).json({ error: 'Valid UPI ID is required for online payment' });
      }
      if (onlineDetails?.type === 'card' && (!onlineDetails.cardNumber || !onlineDetails.expiry || !onlineDetails.cvv)) {
        return res.status(400).json({ error: 'Complete card details are required' });
      }
      txnId = 'BZR-TXN-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      paymentStatus = 'paid';
    }

    const createdOrders: any[] = [];
    const now = Date.now();
    const buyerId = authUser && authUser.role === 'BUYER' ? authUser.id : null;

    // Validate products and stocks first
    for (const item of items) {
      const p = await getOne<any>('SELECT * FROM products WHERE id = ?', [item.productId]);
      if (!p) {
        return res.status(404).json({ error: `Product not found: ${item.productId}` });
      }
      if (p.stock < item.qty) {
        return res.status(400).json({ error: `Insufficient stock for "${p.name}". Only ${p.stock} available.` });
      }
    }

    // Process order for each item/vendor
    for (const item of items) {
      const p = await getOne<any>('SELECT * FROM products WHERE id = ?', [item.productId]);
      const orderId = 'ord_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      const itemAmount = p.price * Number(item.qty);

      // 1. Insert order
      await execute(
        `INSERT INTO orders (
          id, seller_email, buyer_id, product_id, product_name, product_category, product_art_seed,
          buyer_name, buyer_phone, buyer_address, buyer_pincode, qty, amount,
          status, payment_method, payment_status, txn_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          p.seller_email,
          buyerId,
          p.id,
          p.name,
          p.category,
          p.art_seed || 0,
          String(buyerName).trim(),
          String(buyerPhone).trim(),
          String(buyerAddress).trim(),
          String(buyerPincode).trim(),
          Number(item.qty),
          itemAmount,
          'pending',
          payMethodClean,
          paymentStatus,
          txnId,
          now
        ]
      );

      // 2. Insert order items
      await execute(
        'INSERT INTO order_items (order_id, product_id, product_name, price, qty, amount) VALUES (?, ?, ?, ?, ?, ?)',
        [orderId, p.id, p.name, p.price, Number(item.qty), itemAmount]
      );

      // 3. Insert payment record
      await execute(
        'INSERT INTO payments (order_id, payment_method, payment_status, amount, txn_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [orderId, payMethodClean, paymentStatus, itemAmount, txnId, now]
      );

      // 4. Reduce stock
      const newStock = Math.max(0, p.stock - Number(item.qty));
      await execute('UPDATE products SET stock = ? WHERE id = ?', [newStock, p.id]);

      createdOrders.push({
        id: orderId,
        productName: p.name,
        qty: Number(item.qty),
        amount: itemAmount,
        status: 'pending',
        paymentMethod: payMethodClean,
        paymentStatus,
        txnId
      });
    }

    // 5. Clear cart if logged in buyer
    if (buyerId) {
      const cart = await getOne<any>('SELECT id FROM cart WHERE buyer_id = ?', [buyerId]);
      if (cart) {
        await execute('DELETE FROM cart_items WHERE cart_id = ?', [cart.id]);
      }
    }

    res.status(201).json({
      message: 'Order placed successfully',
      orders: createdOrders,
      totalAmount: createdOrders.reduce((a, b) => a + b.amount, 0),
      txnId
    });
  } catch (err: any) {
    console.error('Order placement error:', err);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

// Get order details
router.get('/:id', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const order = await getOne<any>('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const items = await query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
    const payments = await query('SELECT * FROM payments WHERE order_id = ?', [order.id]);

    res.json({ ...order, items, payments });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
});

export default router;
