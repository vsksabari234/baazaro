import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { query, getOne, execute } from '../db.ts';
import { authMiddleware, requireRole } from '../middleware/auth.ts';

const router = Router();

// Helper to auto-resolve Pinterest pins or external images and save locally
async function resolveAndDownloadImage(rawUrl: string): Promise<string> {
  if (!rawUrl) return '';
  rawUrl = rawUrl.trim();
  if (rawUrl.startsWith('/') || rawUrl.startsWith('data:image/')) return rawUrl;

  try {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    let directUrl = rawUrl;
    // Check if Pinterest shortlink or pin page
    if (rawUrl.includes('pin.it') || rawUrl.includes('pinterest.com/pin/')) {
      const resp = await fetch(rawUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        redirect: 'follow',
      });
      const html = await resp.text();
      const match = html.match(/https:\/\/i\.pinimg\.com\/(?:736x|originals|[a-z0-9]+)\/[^"'\s\)]+\.(?:jpg|png|webp|jpeg)/i)
                 || html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
      if (match) {
        directUrl = match[1] || match[0];
      }
    }

    // Download directUrl
    const imgResp = await fetch(directUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });
    if (imgResp.ok) {
      const contentType = imgResp.headers.get('content-type') || '';
      if (contentType.startsWith('image/') || directUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
        let ext = 'jpg';
        if (contentType.includes('png') || directUrl.endsWith('.png')) ext = 'png';
        else if (contentType.includes('webp') || directUrl.endsWith('.webp')) ext = 'webp';

        const arrayBuf = await imgResp.arrayBuffer();
        const buf = Buffer.from(arrayBuf);
        const fileName = 'web_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7) + '.' + ext;
        const filePath = path.join(uploadsDir, fileName);
        fs.writeFileSync(filePath, buf);
        return '/uploads/' + fileName;
      }
    }
  } catch (err) {
    console.warn('Could not auto-resolve/download image URL:', err);
  }

  return rawUrl;
}

// Public image resolution route
router.post('/resolve-image-url', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'No URL provided' });
    const resolved = await resolveAndDownloadImage(url);
    res.json({ imageUrl: resolved });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to resolve image URL' });
  }
});

// Protect seller-specific management endpoints
router.use(authMiddleware, requireRole('SELLER'));

// Helper to get current seller record
async function getCurrentSeller(req: Request) {
  const authUser = (req as any).user;
  return await getOne<any>('SELECT * FROM sellers WHERE id = ? OR email = ?', [authUser.id, authUser.email]);
}

// 1. Seller Profile
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const seller = await getCurrentSeller(req);
    if (!seller) return res.status(404).json({ error: 'Seller profile not found' });
    res.json(seller);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

router.put('/profile', async (req: Request, res: Response) => {
  try {
    const seller = await getCurrentSeller(req);
    if (!seller) return res.status(404).json({ error: 'Seller not found' });

    const { shopName, about } = req.body;
    if (!shopName || !String(shopName).trim()) {
      return res.status(400).json({ error: 'Shop name cannot be empty' });
    }

    await execute(
      'UPDATE sellers SET shop_name = ?, about = ? WHERE id = ?',
      [String(shopName).trim(), about ? String(about).trim() : '', seller.id]
    );

    // Also update seller_name on their existing products
    await execute('UPDATE products SET seller_name = ? WHERE seller_email = ?', [String(shopName).trim(), seller.email]);

    const updated = await getCurrentSeller(req);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// 2. Seller Products
router.get('/products', async (req: Request, res: Response) => {
  try {
    const seller = await getCurrentSeller(req);
    if (!seller) return res.status(404).json({ error: 'Seller not found' });

    const products = await query('SELECT * FROM products WHERE seller_email = ? ORDER BY created_at DESC', [seller.email]);
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve products' });
  }
});

router.post('/products', async (req: Request, res: Response) => {
  try {
    const seller = await getCurrentSeller(req);
    if (!seller) return res.status(404).json({ error: 'Seller not found' });
    if (seller.status === 'suspended') {
      return res.status(403).json({ error: 'Your shop is suspended by the platform administrator' });
    }

    const { name, category, price, oldPrice, stock, description, artSeed, imageUrl, image_url } = req.body;
    if (!name || isNaN(price) || price <= 0 || isNaN(stock) || stock < 0) {
      return res.status(400).json({ error: 'Please provide valid product name, price and stock' });
    }

    const rawImg = (imageUrl || image_url || '').trim();
    const resolvedImage = await resolveAndDownloadImage(rawImg);
    const id = 'prod_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const now = Date.now();

    await execute(
      `INSERT INTO products (
        id, seller_email, seller_name, name, category, price, old_price,
        stock, description, art_seed, image_url, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        seller.email,
        seller.shop_name,
        String(name).trim(),
        category || 'Other',
        Number(price),
        oldPrice ? Number(oldPrice) : null,
        Number(stock),
        description ? String(description).trim() : '',
        artSeed || Math.floor(Math.random() * 10000),
        resolvedImage,
        'active',
        now
      ]
    );

    const created = await getOne('SELECT * FROM products WHERE id = ?', [id]);
    res.status(201).json(created);
  } catch (err: any) {
    console.error('Error adding product:', err);
    res.status(500).json({ error: 'Failed to add product' });
  }
});

// Upload image handler
router.post('/upload-image', async (req: Request, res: Response) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'No image provided' });

    let buffer: Buffer;
    let ext = 'jpg';
    const matches = String(imageBase64).match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const mime = matches[1].toLowerCase();
      if (mime.includes('png')) ext = 'png';
      else if (mime.includes('webp')) ext = 'webp';
      else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(String(imageBase64), 'base64');
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const safeName = 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7) + '.' + ext;
    const filePath = path.join(uploadsDir, safeName);
    fs.writeFileSync(filePath, buffer);

    res.json({ url: '/uploads/' + safeName });
  } catch (err: any) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

router.put('/products/:id', async (req: Request, res: Response) => {
  try {
    const seller = await getCurrentSeller(req);
    if (!seller) return res.status(404).json({ error: 'Seller not found' });
    if (seller.status === 'suspended') {
      return res.status(403).json({ error: 'Your shop is suspended' });
    }

    const productId = req.params.id;
    const existing = await getOne<any>('SELECT * FROM products WHERE id = ? AND seller_email = ?', [productId, seller.email]);
    if (!existing) return res.status(404).json({ error: 'Product not found or not owned by your shop' });

    const { name, category, price, oldPrice, stock, description, artSeed, imageUrl, image_url } = req.body;
    let newImage = imageUrl !== undefined ? imageUrl : (image_url !== undefined ? image_url : existing.image_url);
    if (newImage && newImage !== existing.image_url) {
      newImage = await resolveAndDownloadImage(String(newImage).trim());
    }

    await execute(
      `UPDATE products SET
        name = ?, category = ?, price = ?, old_price = ?, stock = ?, description = ?, art_seed = ?, image_url = ?
       WHERE id = ?`,
      [
        name !== undefined ? String(name).trim() : existing.name,
        category !== undefined ? category : existing.category,
        price !== undefined ? Number(price) : existing.price,
        oldPrice !== undefined ? (oldPrice ? Number(oldPrice) : null) : existing.old_price,
        stock !== undefined ? Number(stock) : existing.stock,
        description !== undefined ? String(description).trim() : existing.description,
        artSeed !== undefined ? Number(artSeed) : existing.art_seed,
        newImage || '',
        productId
      ]
    );

    const updated = await getOne('SELECT * FROM products WHERE id = ?', [productId]);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

router.delete('/products/:id', async (req: Request, res: Response) => {
  try {
    const seller = await getCurrentSeller(req);
    if (!seller) return res.status(404).json({ error: 'Seller not found' });

    const productId = req.params.id;
    await execute('DELETE FROM products WHERE id = ? AND seller_email = ?', [productId, seller.email]);
    res.json({ message: 'Product removed' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// 3. Seller Orders
router.get('/orders', async (req: Request, res: Response) => {
  try {
    const seller = await getCurrentSeller(req);
    if (!seller) return res.status(404).json({ error: 'Seller not found' });

    const orders = await query('SELECT * FROM orders WHERE seller_email = ? ORDER BY created_at DESC', [seller.email]);
    res.json(orders);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve orders' });
  }
});

router.put('/orders/:id/status', async (req: Request, res: Response) => {
  try {
    const seller = await getCurrentSeller(req);
    if (!seller) return res.status(404).json({ error: 'Seller not found' });

    const orderId = req.params.id;
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const order = await getOne<any>('SELECT * FROM orders WHERE id = ? AND seller_email = ?', [orderId, seller.email]);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    await execute('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
    res.json({ message: 'Order status updated', id: orderId, status });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

export default router;
