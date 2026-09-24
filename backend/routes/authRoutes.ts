import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query, getOne, execute } from '../db.ts';
import { signToken, authMiddleware } from '../middleware/auth.ts';

const router = Router();

// Register new Buyer or Seller
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, role = 'BUYER', name, shopName, phone } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const existing = await getOne('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const assignedRole = role === 'SELLER' ? 'SELLER' : 'BUYER';
    const now = Date.now();

    const userResult = await execute(
      'INSERT INTO users (email, password, role, created_at) VALUES (?, ?, ?, ?)',
      [cleanEmail, hashedPassword, assignedRole, now]
    );

    const userId = Number(userResult.insertId);

    if (assignedRole === 'BUYER') {
      const buyerName = (name && String(name).trim()) || cleanEmail.split('@')[0];
      const buyerRes = await execute(
        'INSERT INTO buyers (user_id, name, email, phone, avatar_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, buyerName, cleanEmail, phone || '', '', now, now]
      );
      const buyerId = Number(buyerRes.insertId);

      // Create cart & wishlist records
      await execute('INSERT INTO cart (buyer_id, created_at) VALUES (?, ?)', [buyerId, now]);
      await execute('INSERT INTO wishlist (buyer_id, created_at) VALUES (?, ?)', [buyerId, now]);

      const token = signToken({
        id: buyerId,
        userId,
        email: cleanEmail,
        role: 'BUYER',
        name: buyerName,
      });

      return res.json({
        token,
        user: { id: buyerId, userId, email: cleanEmail, role: 'BUYER', name: buyerName, phone: phone || '', avatarUrl: '' }
      });
    } else {
      const sellerShop = (shopName && String(shopName).trim()) || cleanEmail.split('@')[0] + "'s Shop";
      const sellerRes = await execute(
        'INSERT INTO sellers (user_id, email, shop_name, about, status, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, cleanEmail, sellerShop, '', 'active', hashedPassword, now]
      );
      const sellerId = Number(sellerRes.insertId);

      const token = signToken({
        id: sellerId,
        userId,
        email: cleanEmail,
        role: 'SELLER',
        shopName: sellerShop,
      });

      return res.json({
        token,
        user: { id: sellerId, userId, email: cleanEmail, role: 'SELLER', shopName: sellerShop, status: 'active' }
      });
    }
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to register account' });
  }
});

// Login (Buyer, Seller, or Admin)
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password, requestedRole } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = await getOne<{ id: number; email: string; password: string; role: 'BUYER' | 'SELLER' | 'ADMIN' }>(
      'SELECT * FROM users WHERE email = ?',
      [cleanEmail]
    );

    if (!user) {
      // Check if it's a seller in sellers table directly
      const seller = await getOne<any>('SELECT * FROM sellers WHERE email = ?', [cleanEmail]);
      if (seller) {
        // Test password with bcrypt or direct hash comparison
        let valid = await bcrypt.compare(password, seller.password_hash || '');
        if (!valid) {
          // Check SHA256 fallback
          const crypto = await import('crypto');
          const sha = crypto.createHash('sha256').update('bazaaro::' + cleanEmail + '::' + password).digest('hex');
          if (sha === seller.password_hash) valid = true;
        }

        if (valid) {
          const token = signToken({
            id: seller.id,
            userId: seller.user_id || seller.id,
            email: seller.email,
            role: 'SELLER',
            shopName: seller.shop_name,
          });
          return res.json({
            token,
            user: { id: seller.id, email: seller.email, role: 'SELLER', shopName: seller.shop_name, status: seller.status, about: seller.about }
          });
        }
      }

      // Check admin table directly
      const admin = await getOne<any>('SELECT * FROM admins WHERE email = ?', [cleanEmail]);
      if (admin) {
        let valid = await bcrypt.compare(password, admin.password_hash || '');
        if (!valid) {
          const crypto = await import('crypto');
          const sha = crypto.createHash('sha256').update('bazaaro::' + cleanEmail + '::' + password).digest('hex');
          if (sha === admin.password_hash) valid = true;
        }
        if (valid) {
          const token = signToken({
            id: admin.id,
            userId: admin.user_id || admin.id,
            email: admin.email,
            role: 'ADMIN',
          });
          return res.json({
            token,
            user: { id: admin.id, email: admin.email, role: 'ADMIN' }
          });
        }
      }

      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Validate password
    let isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const crypto = await import('crypto');
      const sha = crypto.createHash('sha256').update('bazaaro::' + cleanEmail + '::' + password).digest('hex');
      if (sha === user.password) isMatch = true;
    }

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (requestedRole && requestedRole !== user.role) {
      return res.status(403).json({ error: `This account is registered as ${user.role}, not ${requestedRole}` });
    }

    let payload: any = { id: user.id, userId: user.id, email: user.email, role: user.role };
    let extraData: any = {};

    if (user.role === 'BUYER') {
      const buyer = await getOne<any>('SELECT * FROM buyers WHERE user_id = ?', [user.id]);
      if (buyer) {
        payload.id = buyer.id;
        payload.name = buyer.name;
        extraData = { name: buyer.name, phone: buyer.phone, avatarUrl: buyer.avatar_url };
      }
    } else if (user.role === 'SELLER') {
      const seller = await getOne<any>('SELECT * FROM sellers WHERE email = ?', [user.email]);
      if (seller) {
        payload.id = seller.id;
        payload.shopName = seller.shop_name;
        extraData = { shopName: seller.shop_name, about: seller.about, status: seller.status };
      }
    }

    const token = signToken(payload);
    return res.json({
      token,
      user: { ...payload, ...extraData }
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed due to a server error' });
  }
});

// Current User Profile / Status
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    if (authUser.role === 'BUYER') {
      const buyer = await getOne<any>('SELECT * FROM buyers WHERE id = ?', [authUser.id]);
      if (!buyer) return res.status(404).json({ error: 'Buyer profile not found' });
      return res.json({
        id: buyer.id,
        userId: buyer.user_id,
        email: buyer.email,
        name: buyer.name,
        phone: buyer.phone,
        avatarUrl: buyer.avatar_url,
        role: 'BUYER',
        createdAt: buyer.created_at,
      });
    } else if (authUser.role === 'SELLER') {
      const seller = await getOne<any>('SELECT * FROM sellers WHERE id = ? OR email = ?', [authUser.id, authUser.email]);
      if (!seller) return res.status(404).json({ error: 'Seller profile not found' });
      return res.json({
        id: seller.id,
        email: seller.email,
        shopName: seller.shop_name,
        about: seller.about,
        status: seller.status,
        role: 'SELLER',
        createdAt: seller.created_at,
      });
    } else if (authUser.role === 'ADMIN') {
      return res.json({
        id: authUser.id,
        email: authUser.email,
        role: 'ADMIN',
      });
    }

    res.json(authUser);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

export default router;
