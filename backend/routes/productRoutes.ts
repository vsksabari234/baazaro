import { Router, Request, Response } from 'express';
import { query, getOne } from '../db.ts';

const router = Router();

// GET all products (active sellers only, optional category & search filter)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, search, seller } = req.query;

    let sql = `
      SELECT p.*, s.shop_name as seller_shop_name, s.status as seller_status
      FROM products p
      LEFT JOIN sellers s ON p.seller_email = s.email
      WHERE (s.status IS NULL OR s.status != 'suspended')
    `;
    const params: any[] = [];

    if (category && String(category).trim()) {
      sql += ' AND p.category = ?';
      params.push(String(category).trim());
    }

    if (search && String(search).trim()) {
      sql += ' AND (LOWER(p.name) LIKE ? OR LOWER(p.description) LIKE ?)';
      const term = `%${String(search).trim().toLowerCase()}%`;
      params.push(term, term);
    }

    if (seller && String(seller).trim()) {
      sql += ' AND p.seller_email = ?';
      params.push(String(seller).trim());
    }

    sql += ' ORDER BY p.created_at DESC';

    const products = await query(sql, params);
    res.json(products);
  } catch (err: any) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Failed to retrieve products' });
  }
});

// GET categories
router.get('/categories', async (_req: Request, res: Response) => {
  try {
    const categories = await query('SELECT * FROM categories ORDER BY id ASC');
    res.json(categories);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET single product
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const product = await getOne<any>(
      `SELECT p.*, s.shop_name as seller_shop_name, s.status as seller_status, s.about as seller_about
       FROM products p
       LEFT JOIN sellers s ON p.seller_email = s.email
       WHERE p.id = ?`,
      [req.params.id]
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Include reviews
    const reviews = await query(
      'SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC',
      [product.id]
    );

    res.json({ ...product, reviews });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve product details' });
  }
});

export default router;
