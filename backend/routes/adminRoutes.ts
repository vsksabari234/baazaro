import { Router, Request, Response } from 'express';
import { query, getOne, execute } from '../db.ts';
import { authMiddleware, requireRole } from '../middleware/auth.ts';

const router = Router();

// Protect all admin endpoints with ADMIN role check
router.use(authMiddleware, requireRole('ADMIN'));

// Platform Overview Stats
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const sellers = await query('SELECT * FROM sellers');
    const products = await query('SELECT * FROM products');
    const orders = await query('SELECT * FROM orders');

    const gmv = orders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
    const activeSellers = sellers.filter(s => s.status !== 'suspended').length;

    const statusCounts: Record<string, number> = { pending: 0, confirmed: 0, shipped: 0, delivered: 0 };
    orders.forEach(o => {
      if (statusCounts[o.status] !== undefined) statusCounts[o.status]++;
    });

    res.json({
      sellersCount: sellers.length,
      activeSellersCount: activeSellers,
      productsCount: products.length,
      ordersCount: orders.length,
      gmv,
      statusCounts
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to compute admin statistics' });
  }
});

// Manage Sellers
router.get('/sellers', async (_req: Request, res: Response) => {
  try {
    const sellers = await query('SELECT * FROM sellers ORDER BY created_at DESC');
    const products = await query('SELECT seller_email, count(*) as count FROM products GROUP BY seller_email');
    const pCountMap: Record<string, number> = {};
    products.forEach((p: any) => { pCountMap[p.seller_email] = p.count; });

    const result = sellers.map(s => ({
      ...s,
      productCount: pCountMap[s.email] || 0
    }));

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve sellers' });
  }
});

router.put('/sellers/:id/status', async (req: Request, res: Response) => {
  try {
    const sellerId = req.params.id;
    const { status } = req.body;

    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Status must be "active" or "suspended"' });
    }

    const seller = await getOne<any>('SELECT * FROM sellers WHERE id = ? OR email = ?', [sellerId, sellerId]);
    if (!seller) return res.status(404).json({ error: 'Seller not found' });

    await execute('UPDATE sellers SET status = ? WHERE id = ?', [status, seller.id]);
    res.json({ message: 'Seller status updated', status });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update seller status' });
  }
});

// Manage Products
router.get('/products', async (_req: Request, res: Response) => {
  try {
    const products = await query('SELECT * FROM products ORDER BY created_at DESC');
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve products' });
  }
});

router.delete('/products/:id', async (req: Request, res: Response) => {
  try {
    const productId = req.params.id;
    await execute('DELETE FROM products WHERE id = ?', [productId]);
    res.json({ message: 'Product removed by admin' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Manage Orders
router.get('/orders', async (_req: Request, res: Response) => {
  try {
    const orders = await query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 100');
    res.json(orders);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve orders' });
  }
});

export default router;
