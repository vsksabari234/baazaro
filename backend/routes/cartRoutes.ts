import { Router, Request, Response } from 'express';
import { query, getOne, execute } from '../db.ts';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.ts';

const router = Router();

// Retrieve cart items
router.get('/', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    if (!authUser || authUser.role !== 'BUYER') {
      return res.json([]);
    }

    let cart = await getOne<any>('SELECT id FROM cart WHERE buyer_id = ?', [authUser.id]);
    if (!cart) {
      const cRes = await execute('INSERT INTO cart (buyer_id, created_at) VALUES (?, ?)', [authUser.id, Date.now()]);
      cart = { id: cRes.insertId };
    }

    const items = await query(
      `SELECT ci.id as cart_item_id, ci.qty, p.*, s.shop_name as seller_shop_name
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       LEFT JOIN sellers s ON p.seller_email = s.email
       WHERE ci.cart_id = ?
       ORDER BY ci.created_at ASC`,
      [cart.id]
    );

    res.json(items);
  } catch (err: any) {
    console.error('Error fetching cart:', err);
    res.status(500).json({ error: 'Failed to retrieve cart' });
  }
});

// Add item to cart
router.post('/items', authMiddleware, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    if (authUser.role !== 'BUYER') {
      return res.status(403).json({ error: 'Only buyers can add items to cart' });
    }

    const { productId, qty = 1 } = req.body;
    if (!productId) return res.status(400).json({ error: 'Product ID is required' });

    const product = await getOne<any>('SELECT * FROM products WHERE id = ?', [productId]);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.stock <= 0) return res.status(400).json({ error: 'Product is currently sold out' });

    let cart = await getOne<any>('SELECT id FROM cart WHERE buyer_id = ?', [authUser.id]);
    if (!cart) {
      const cRes = await execute('INSERT INTO cart (buyer_id, created_at) VALUES (?, ?)', [authUser.id, Date.now()]);
      cart = { id: cRes.insertId };
    }

    const existing = await getOne<any>('SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?', [cart.id, productId]);
    const targetQty = existing ? existing.qty + Number(qty) : Number(qty);
    const clampedQty = Math.min(targetQty, product.stock);

    if (existing) {
      await execute('UPDATE cart_items SET qty = ? WHERE id = ?', [clampedQty, existing.id]);
    } else {
      await execute('INSERT INTO cart_items (cart_id, product_id, qty, created_at) VALUES (?, ?, ?, ?)', [cart.id, productId, clampedQty, Date.now()]);
    }

    const items = await query(
      `SELECT ci.id as cart_item_id, ci.qty, p.* 
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = ?`,
      [cart.id]
    );

    res.json(items);
  } catch (err: any) {
    console.error('Error adding to cart:', err);
    res.status(500).json({ error: 'Failed to add item to cart' });
  }
});

// Update cart item quantity
router.put('/items/:productId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const productId = req.params.productId;
    const { qty } = req.body;

    const cart = await getOne<any>('SELECT id FROM cart WHERE buyer_id = ?', [authUser.id]);
    if (!cart) return res.status(404).json({ error: 'Cart not found' });

    const product = await getOne<any>('SELECT stock FROM products WHERE id = ?', [productId]);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const newQty = Number(qty);
    if (newQty <= 0) {
      await execute('DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?', [cart.id, productId]);
    } else {
      const clamped = Math.min(newQty, product.stock);
      await execute('UPDATE cart_items SET qty = ? WHERE cart_id = ? AND product_id = ?', [clamped, cart.id, productId]);
    }

    res.json({ message: 'Cart updated' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update cart item' });
  }
});

// Remove item from cart
router.delete('/items/:productId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const productId = req.params.productId;

    const cart = await getOne<any>('SELECT id FROM cart WHERE buyer_id = ?', [authUser.id]);
    if (cart) {
      await execute('DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?', [cart.id, productId]);
    }

    res.json({ message: 'Item removed from cart' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to remove item' });
  }
});

// Clear cart
router.delete('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const cart = await getOne<any>('SELECT id FROM cart WHERE buyer_id = ?', [authUser.id]);
    if (cart) {
      await execute('DELETE FROM cart_items WHERE cart_id = ?', [cart.id]);
    }
    res.json({ message: 'Cart cleared' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

export default router;
