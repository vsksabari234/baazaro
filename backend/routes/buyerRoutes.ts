import { Router, Request, Response } from 'express';
import { query, getOne, execute } from '../db.ts';
import { authMiddleware, requireRole } from '../middleware/auth.ts';

const router = Router();

// Protect all buyer routes with BUYER role check
router.use(authMiddleware, requireRole('BUYER'));

// 1. Get Buyer Profile
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const buyer = await getOne<any>('SELECT * FROM buyers WHERE id = ?', [authUser.id]);
    if (!buyer) return res.status(404).json({ error: 'Buyer profile not found' });

    res.json({
      id: buyer.id,
      userId: buyer.user_id,
      email: buyer.email,
      name: buyer.name,
      phone: buyer.phone || '',
      avatarUrl: buyer.avatar_url || '',
      createdAt: buyer.created_at,
      updatedAt: buyer.updated_at,
    });
  } catch (err: any) {
    console.error('Error fetching buyer profile:', err);
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

// 2. Update Buyer Profile
router.put('/profile', async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const { name, phone, avatarUrl } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Name cannot be empty' });
    }

    const cleanName = String(name).trim();
    const cleanPhone = phone ? String(phone).trim() : '';
    const cleanAvatar = avatarUrl ? String(avatarUrl).trim() : '';
    const now = Date.now();

    await execute(
      'UPDATE buyers SET name = ?, phone = ?, avatar_url = ?, updated_at = ? WHERE id = ?',
      [cleanName, cleanPhone, cleanAvatar, now, authUser.id]
    );

    const updated = await getOne<any>('SELECT * FROM buyers WHERE id = ?', [authUser.id]);
    res.json({
      message: 'Profile updated successfully',
      buyer: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        phone: updated.phone || '',
        avatarUrl: updated.avatar_url || '',
        updatedAt: updated.updated_at,
      }
    });
  } catch (err: any) {
    console.error('Error updating buyer profile:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// 3. Saved Addresses
router.get('/addresses', async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const addresses = await query(
      'SELECT * FROM addresses WHERE buyer_id = ? ORDER BY is_default DESC, created_at DESC',
      [authUser.id]
    );
    res.json(addresses);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch addresses' });
  }
});

router.post('/addresses', async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const { fullName, phone, pincode, addressLine, tag = 'Home', isDefault = 0 } = req.body;

    if (!fullName || !phone || !pincode || !addressLine) {
      return res.status(400).json({ error: 'Full name, phone, pincode, and address are required' });
    }

    const now = Date.now();
    // If setting as default, clear other defaults
    if (isDefault) {
      await execute('UPDATE addresses SET is_default = 0 WHERE buyer_id = ?', [authUser.id]);
    }

    // If first address, make it default automatically
    const existing = await query('SELECT count(*) as count FROM addresses WHERE buyer_id = ?', [authUser.id]);
    const isFirst = Number(existing[0]?.count || 0) === 0;

    const result = await execute(
      'INSERT INTO addresses (buyer_id, full_name, phone, pincode, address_line, tag, is_default, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [authUser.id, String(fullName).trim(), String(phone).trim(), String(pincode).trim(), String(addressLine).trim(), tag || 'Home', isDefault || isFirst ? 1 : 0, now]
    );

    const created = await getOne('SELECT * FROM addresses WHERE id = ?', [result.insertId]);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save address' });
  }
});

router.put('/addresses/:id', async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const addressId = req.params.id;
    const { fullName, phone, pincode, addressLine, tag = 'Home', isDefault } = req.body;

    const existing = await getOne<any>('SELECT * FROM addresses WHERE id = ? AND buyer_id = ?', [addressId, authUser.id]);
    if (!existing) return res.status(404).json({ error: 'Address not found' });

    if (isDefault) {
      await execute('UPDATE addresses SET is_default = 0 WHERE buyer_id = ?', [authUser.id]);
    }

    await execute(
      'UPDATE addresses SET full_name = ?, phone = ?, pincode = ?, address_line = ?, tag = ?, is_default = ? WHERE id = ?',
      [
        fullName !== undefined ? String(fullName).trim() : existing.full_name,
        phone !== undefined ? String(phone).trim() : existing.phone,
        pincode !== undefined ? String(pincode).trim() : existing.pincode,
        addressLine !== undefined ? String(addressLine).trim() : existing.address_line,
        tag || existing.tag,
        isDefault !== undefined ? (isDefault ? 1 : 0) : existing.is_default,
        addressId
      ]
    );

    const updated = await getOne('SELECT * FROM addresses WHERE id = ?', [addressId]);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update address' });
  }
});

router.delete('/addresses/:id', async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const addressId = req.params.id;
    await execute('DELETE FROM addresses WHERE id = ? AND buyer_id = ?', [addressId, authUser.id]);
    res.json({ message: 'Address removed' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete address' });
  }
});

router.put('/addresses/:id/default', async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const addressId = req.params.id;
    await execute('UPDATE addresses SET is_default = 0 WHERE buyer_id = ?', [authUser.id]);
    await execute('UPDATE addresses SET is_default = 1 WHERE id = ? AND buyer_id = ?', [addressId, authUser.id]);
    res.json({ message: 'Default address updated' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to set default address' });
  }
});

// 4. Buyer Order History
router.get('/orders', async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const orders = await query(
      `SELECT o.*, p.art_seed as product_art_seed, p.category as product_category 
       FROM orders o 
       LEFT JOIN products p ON o.product_id = p.id 
       WHERE o.buyer_id = ? 
       ORDER BY o.created_at DESC`,
      [authUser.id]
    );
    res.json(orders);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch order history' });
  }
});

// 5. Wishlist Management
router.get('/wishlist', async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    let wishlist = await getOne<any>('SELECT id FROM wishlist WHERE buyer_id = ?', [authUser.id]);
    if (!wishlist) {
      const wRes = await execute('INSERT INTO wishlist (buyer_id, created_at) VALUES (?, ?)', [authUser.id, Date.now()]);
      wishlist = { id: wRes.insertId };
    }

    const items = await query(
      `SELECT p.*, wi.created_at as wished_at 
       FROM wishlist_items wi 
       JOIN products p ON wi.product_id = p.id 
       WHERE wi.wishlist_id = ? 
       ORDER BY wi.created_at DESC`,
      [wishlist.id]
    );
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
});

router.post('/wishlist/:productId', async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const productId = req.params.productId;

    let wishlist = await getOne<any>('SELECT id FROM wishlist WHERE buyer_id = ?', [authUser.id]);
    if (!wishlist) {
      const wRes = await execute('INSERT INTO wishlist (buyer_id, created_at) VALUES (?, ?)', [authUser.id, Date.now()]);
      wishlist = { id: wRes.insertId };
    }

    const exists = await getOne('SELECT id FROM wishlist_items WHERE wishlist_id = ? AND product_id = ?', [wishlist.id, productId]);
    if (!exists) {
      await execute('INSERT INTO wishlist_items (wishlist_id, product_id, created_at) VALUES (?, ?, ?)', [wishlist.id, productId, Date.now()]);
    }

    res.json({ message: 'Added to wishlist', productId });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to add to wishlist' });
  }
});

router.delete('/wishlist/:productId', async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const productId = req.params.productId;

    const wishlist = await getOne<any>('SELECT id FROM wishlist WHERE buyer_id = ?', [authUser.id]);
    if (wishlist) {
      await execute('DELETE FROM wishlist_items WHERE wishlist_id = ? AND product_id = ?', [wishlist.id, productId]);
    }

    res.json({ message: 'Removed from wishlist', productId });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
});

export default router;
