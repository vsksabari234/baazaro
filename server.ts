import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './backend/db.ts';

import authRoutes from './backend/routes/authRoutes.ts';
import buyerRoutes from './backend/routes/buyerRoutes.ts';
import productRoutes from './backend/routes/productRoutes.ts';
import cartRoutes from './backend/routes/cartRoutes.ts';
import orderRoutes from './backend/routes/orderRoutes.ts';
import sellerRoutes from './backend/routes/sellerRoutes.ts';
import adminRoutes from './backend/routes/adminRoutes.ts';
import reviewRoutes from './backend/routes/reviewRoutes.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Relational Database (MySQL / SQLite relational fallback)
  await initDatabase();

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Static assets
  app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
  app.use('/products', express.static(path.join(__dirname, 'public/products')));

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/buyers', buyerRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/seller', sellerRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/reviews', reviewRoutes);

  // Shortcut for GET /api/categories
  app.get('/api/categories', async (req, res, next) => {
    req.url = '/categories';
    productRoutes(req, res, next);
  });

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: Date.now() });
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Bazaaro server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
