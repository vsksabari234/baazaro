import { Router, Request, Response } from 'express';
import { query, getOne, execute } from '../db.ts';
import { authMiddleware, requireRole } from '../middleware/auth.ts';

const router = Router();

// GET reviews for a product
router.get('/product/:productId', async (req: Request, res: Response) => {
  try {
    const reviews = await query(
      'SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC',
      [req.params.productId]
    );
    res.json(reviews);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve reviews' });
  }
});

// POST review (only authenticated buyers)
router.post('/', authMiddleware, requireRole('BUYER'), async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const { productId, rating, review, orderId } = req.body;

    if (!productId || !rating || !review) {
      return res.status(400).json({ error: 'Product ID, rating (1-5), and review text are required' });
    }

    const ratingNum = Math.max(1, Math.min(5, parseInt(rating, 10)));
    const buyer = await getOne<any>('SELECT name FROM buyers WHERE id = ?', [authUser.id]);
    const buyerName = buyer ? buyer.name : (authUser.name || 'Bazaaro Buyer');

    // Prevent duplicate review for the same order/product
    if (orderId) {
      const existing = await getOne('SELECT id FROM reviews WHERE order_id = ? AND product_id = ?', [orderId, productId]);
      if (existing) {
        return res.status(400).json({ error: 'You have already reviewed this item from this order' });
      }
    }

    const now = Date.now();
    const result = await execute(
      'INSERT INTO reviews (buyer_id, buyer_name, product_id, order_id, rating, review, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [authUser.id, buyerName, productId, orderId || null, ratingNum, String(review).trim(), now]
    );

    const created = await getOne('SELECT * FROM reviews WHERE id = ?', [result.insertId]);
    res.status(201).json(created);
  } catch (err: any) {
    console.error('Error submitting review:', err);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

export default router;
