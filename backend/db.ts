import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const DB_FILE = path.resolve(process.cwd(), 'bazaaro.sqlite');

let mysqlPool: mysql.Pool | null = null;
let sqliteDb: Database | null = null;
let isUsingMySQL = false;

function saveToDisk() {
  if (sqliteDb) {
    try {
      const data = sqliteDb.export();
      fs.writeFileSync(DB_FILE, Buffer.from(data));
    } catch (err) {
      console.error('Failed to write database to disk:', err);
    }
  }
}

// Initialize Database connection (MySQL if available, fallback to SQLite)
export async function initDatabase() {
  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;

  if (host && user && database) {
    try {
      mysqlPool = mysql.createPool({
        host,
        port: Number(process.env.DB_PORT) || 3306,
        user,
        password,
        database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });
      // Test connection
      await mysqlPool.query('SELECT 1');
      isUsingMySQL = true;
      console.log('✅ Connected to MySQL database:', database);
    } catch (err: any) {
      console.warn('⚠️ MySQL connection failed, falling back to embedded SQLite:', err.message);
      isUsingMySQL = false;
      mysqlPool = null;
    }
  }

  if (!isUsingMySQL) {
    try {
      const SQL = await initSqlJs();
      const filebuffer = fs.existsSync(DB_FILE) ? fs.readFileSync(DB_FILE) : null;
      sqliteDb = filebuffer ? new SQL.Database(filebuffer) : new SQL.Database();
      console.log('✅ Connected to local relational database at:', DB_FILE);
    } catch (err: any) {
      console.error('❌ Failed to initialize SQLite WASM:', err);
      throw err;
    }
  }

  await createTables();
  await seedInitialData();
}

export function isMySQL() {
  return isUsingMySQL;
}

// Unified query helpers
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  if (isUsingMySQL && mysqlPool) {
    const [rows] = await mysqlPool.execute(sql, params);
    return rows as T[];
  }

  if (!sqliteDb) throw new Error('Database not initialized');
  try {
    const stmt = sqliteDb.prepare(sql);
    if (params && params.length > 0) {
      stmt.bind(params);
    }
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as T);
    }
    stmt.free();
    return results;
  } catch (err) {
    console.error('Database query error:', err, 'SQL:', sql, 'params:', params);
    throw err;
  }
}

export async function getOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows && rows.length > 0 ? rows[0] : null;
}

export async function execute(sql: string, params: any[] = []): Promise<{ insertId?: number | string; changes?: number }> {
  if (isUsingMySQL && mysqlPool) {
    const [result]: any = await mysqlPool.execute(sql, params);
    return { insertId: result.insertId, changes: result.affectedRows };
  }

  if (!sqliteDb) throw new Error('Database not initialized');
  try {
    sqliteDb.run(sql, params);
    const changes = sqliteDb.getRowsModified();
    let insertId: number | undefined;
    try {
      const res = sqliteDb.exec('SELECT last_insert_rowid() as id');
      if (res && res.length > 0 && res[0].values && res[0].values.length > 0) {
        insertId = res[0].values[0][0] as number;
      }
    } catch {
      // Ignored if not an INSERT
    }
    saveToDisk();
    return { insertId, changes };
  } catch (err) {
    console.error('Database execute error:', err, 'SQL:', sql, 'params:', params);
    throw err;
  }
}

async function createTables() {
  const autoInc = isUsingMySQL ? 'AUTO_INCREMENT' : 'AUTOINCREMENT';
  const textType = isUsingMySQL ? 'LONGTEXT' : 'TEXT';

  const queries = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY ${autoInc},
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'BUYER',
      created_at BIGINT NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS buyers (
      id INTEGER PRIMARY KEY ${autoInc},
      user_id INTEGER UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(50) DEFAULT '',
      avatar_url ${textType},
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS sellers (
      id INTEGER PRIMARY KEY ${autoInc},
      user_id INTEGER UNIQUE,
      email VARCHAR(255) UNIQUE NOT NULL,
      shop_name VARCHAR(255) NOT NULL,
      about ${textType},
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      password_hash VARCHAR(255),
      created_at BIGINT NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY ${autoInc},
      user_id INTEGER UNIQUE,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255),
      created_at BIGINT NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY ${autoInc},
      name VARCHAR(100) UNIQUE NOT NULL,
      icon VARCHAR(50) NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(100) PRIMARY KEY,
      seller_email VARCHAR(255) NOT NULL,
      seller_name VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      price INTEGER NOT NULL,
      old_price INTEGER,
      stock INTEGER NOT NULL DEFAULT 0,
      description ${textType},
      art_seed INTEGER NOT NULL DEFAULT 0,
      image_url ${textType},
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      created_at BIGINT NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS cart (
      id INTEGER PRIMARY KEY ${autoInc},
      buyer_id INTEGER UNIQUE NOT NULL,
      created_at BIGINT NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY ${autoInc},
      cart_id INTEGER NOT NULL,
      product_id VARCHAR(100) NOT NULL,
      qty INTEGER NOT NULL DEFAULT 1,
      created_at BIGINT NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(100) PRIMARY KEY,
      seller_email VARCHAR(255) NOT NULL,
      buyer_id INTEGER,
      product_id VARCHAR(100) NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      product_category VARCHAR(100) NOT NULL,
      product_art_seed INTEGER NOT NULL DEFAULT 0,
      buyer_name VARCHAR(255) NOT NULL,
      buyer_phone VARCHAR(50) NOT NULL,
      buyer_address ${textType} NOT NULL,
      buyer_pincode VARCHAR(50) NOT NULL,
      qty INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      payment_method VARCHAR(50) NOT NULL DEFAULT 'cod',
      payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
      txn_id VARCHAR(100),
      created_at BIGINT NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY ${autoInc},
      order_id VARCHAR(100) NOT NULL,
      product_id VARCHAR(100) NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      price INTEGER NOT NULL,
      qty INTEGER NOT NULL,
      amount INTEGER NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY ${autoInc},
      order_id VARCHAR(100) NOT NULL,
      payment_method VARCHAR(50) NOT NULL,
      payment_status VARCHAR(50) NOT NULL,
      amount INTEGER NOT NULL,
      txn_id VARCHAR(100),
      created_at BIGINT NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS addresses (
      id INTEGER PRIMARY KEY ${autoInc},
      buyer_id INTEGER NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      pincode VARCHAR(50) NOT NULL,
      address_line ${textType} NOT NULL,
      tag VARCHAR(50) DEFAULT 'Home',
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at BIGINT NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY ${autoInc},
      buyer_id INTEGER NOT NULL,
      buyer_name VARCHAR(255) NOT NULL,
      product_id VARCHAR(100) NOT NULL,
      order_id VARCHAR(100),
      rating INTEGER NOT NULL,
      review ${textType} NOT NULL,
      created_at BIGINT NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS wishlist (
      id INTEGER PRIMARY KEY ${autoInc},
      buyer_id INTEGER UNIQUE NOT NULL,
      created_at BIGINT NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS wishlist_items (
      id INTEGER PRIMARY KEY ${autoInc},
      wishlist_id INTEGER NOT NULL,
      product_id VARCHAR(100) NOT NULL,
      created_at BIGINT NOT NULL
    )`
  ];

  for (const q of queries) {
    await execute(q);
  }

  // Column migrations
  try {
    await execute(`ALTER TABLE products ADD COLUMN image_url ${textType}`);
  } catch {
    // Column already exists
  }
}

// Seed categories, demo seller, demo admin, initial products & sample orders
async function seedInitialData() {
  const textType = isUsingMySQL ? 'LONGTEXT' : 'TEXT';

  const productImages: Record<string, string> = {
    'p_kurti_01': '/products/kurti.jpg',
    'p_dupatta_02': '/products/dupatta.jpg',
    'p_palazzo_03': '/products/palazzo.jpg',
    'p_earbuds_04': '/products/earbuds.jpg',
    'p_speaker_05': '/products/speaker.jpg',
    'p_planter_06': '/products/planter.jpg',
    'p_hanging_07': '/products/hanging.jpg',
    'p_facemist_08': '/products/facemist.jpg',
    'p_facewash_09': '/products/facewash.jpg',
    'p_blocks_10': '/products/blocks.jpg',
    'p_sandals_11': '/products/sandals.jpg',
    'p_jhumkas_12': '/products/jhumkas.jpg',
  };

  // Update existing products with images
  for (const [pid, img] of Object.entries(productImages)) {
    try {
      await execute('UPDATE products SET image_url = ? WHERE id = ?', [img, pid]);
    } catch (err) {
      // Ignore if table not ready
    }
  }
  // 1. Categories
  const existingCats = await query('SELECT count(*) as cnt FROM categories');
  const catCount = Number(existingCats[0]?.cnt || 0);
  if (catCount === 0) {
    const defaultCategories = [
      ['Fashion', '👗'],
      ['Electronics', '🎧'],
      ['Home & Kitchen', '🏺'],
      ['Beauty', '🌸'],
      ['Footwear', '👡'],
      ['Grocery', '🥬'],
      ['Jewelry', '💍'],
      ['Toys', '🧸'],
      ['Other', '🛍️']
    ];
    for (const [name, icon] of defaultCategories) {
      await execute('INSERT INTO categories (name, icon) VALUES (?, ?)', [name, icon]);
    }
  }

  // 2. Demo Seller
  const demoSeller = await getOne('SELECT * FROM sellers WHERE email = ?', ['demo@bazaaro.test']);
  const hashedSellerPass = await bcrypt.hash('demo1234', 10);
  if (!demoSeller) {
    const userRes = await execute(
      'INSERT INTO users (email, password, role, created_at) VALUES (?, ?, ?, ?)',
      ['demo@bazaaro.test', hashedSellerPass, 'SELLER', Date.now()]
    );
    await execute(
      'INSERT INTO sellers (user_id, email, shop_name, about, status, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userRes.insertId, 'demo@bazaaro.test', "Meera's Handloom", 'Hand-spun cotton fashion, woven with care in Coimbatore.', 'active', hashedSellerPass, Date.now() - 1000 * 60 * 60 * 24 * 60]
    );
  }

  // Other sellers
  const moreSellers = [
    { email: 'soundnest@bazaaro.test', name: 'SoundNest', about: 'Audio gear from a small electronics studio.' },
    { email: 'earthen@bazaaro.test', name: 'Earthen Studio', about: 'Hand-thrown pottery and home decor.' },
    { email: 'bloom@bazaaro.test', name: 'Bloom Naturals', about: 'Small-batch, plant-based skincare.' },
    { email: 'littlewonders@bazaaro.test', name: 'Little Wonders', about: 'Wooden toys made to last generations.' },
    { email: 'stepup@bazaaro.test', name: 'StepUp Crafts', about: 'Handcrafted leather footwear.' },
    { email: 'silverthread@bazaaro.test', name: 'Silver Thread', about: 'Oxidised silver jewellery, made to order.' }
  ];

  for (const s of moreSellers) {
    const exists = await getOne('SELECT id FROM sellers WHERE email = ?', [s.email]);
    if (!exists) {
      await execute(
        'INSERT INTO sellers (email, shop_name, about, status, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [s.email, s.name, s.about, 'active', hashedSellerPass, Date.now() - 1000 * 60 * 60 * 24 * 30]
      );
    }
  }

  // 3. Demo Admin
  const demoAdmin = await getOne('SELECT * FROM admins WHERE email = ?', ['admin@bazaaro.test']);
  const hashedAdminPass = await bcrypt.hash('admin1234', 10);
  if (!demoAdmin) {
    const userRes = await execute(
      'INSERT INTO users (email, password, role, created_at) VALUES (?, ?, ?, ?)',
      ['admin@bazaaro.test', hashedAdminPass, 'ADMIN', Date.now()]
    );
    await execute(
      'INSERT INTO admins (user_id, email, password_hash, created_at) VALUES (?, ?, ?, ?)',
      [userRes.insertId, 'admin@bazaaro.test', hashedAdminPass, Date.now()]
    );
  }

  // 4. Demo Buyer
  const demoBuyerUser = await getOne('SELECT * FROM users WHERE email = ?', ['buyer@bazaaro.test']);
  let buyerId = 0;
  if (!demoBuyerUser) {
    const hashedBuyerPass = await bcrypt.hash('buyer1234', 10);
    const uRes = await execute(
      'INSERT INTO users (email, password, role, created_at) VALUES (?, ?, ?, ?)',
      ['buyer@bazaaro.test', hashedBuyerPass, 'BUYER', Date.now()]
    );
    const bRes = await execute(
      'INSERT INTO buyers (user_id, name, email, phone, avatar_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uRes.insertId, 'Priya Sharma', 'buyer@bazaaro.test', '9876543210', '', Date.now(), Date.now()]
    );
    buyerId = Number(bRes.insertId);

    // Initial saved address
    await execute(
      'INSERT INTO addresses (buyer_id, full_name, phone, pincode, address_line, tag, is_default, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [buyerId, 'Priya Sharma', '9876543210', '641001', '12 MG Road, RS Puram, Coimbatore, Tamil Nadu', 'Home', 1, Date.now()]
    );

    // Initial cart and wishlist
    await execute('INSERT INTO cart (buyer_id, created_at) VALUES (?, ?)', [buyerId, Date.now()]);
    await execute('INSERT INTO wishlist (buyer_id, created_at) VALUES (?, ?)', [buyerId, Date.now()]);
  }

  // 5. Products
  const pCountRes = await query('SELECT count(*) as cnt FROM products');
  if (Number(pCountRes[0]?.cnt || 0) === 0) {
    const productsToSeed = [
      { id: 'p_kurti_01', name: 'Hand-block Printed Cotton Kurti', category: 'Fashion', price: 799, oldPrice: null, stock: 12, sellerEmail: 'demo@bazaaro.test', sellerName: "Meera's Handloom", artSeed: 11, description: 'Breathable cotton, hand-block printed by artisans in small batches.' },
      { id: 'p_dupatta_02', name: 'Chikankari Embroidered Dupatta', category: 'Fashion', price: 599, oldPrice: 899, stock: 6, sellerEmail: 'demo@bazaaro.test', sellerName: "Meera's Handloom", artSeed: 22, description: 'Delicate chikankari embroidery on soft mulmul fabric.' },
      { id: 'p_palazzo_03', name: 'Organic Cotton Palazzo Set', category: 'Fashion', price: 899, oldPrice: 1099, stock: 9, sellerEmail: 'demo@bazaaro.test', sellerName: "Meera's Handloom", artSeed: 133, description: 'Two-piece co-ord set in breathable organic cotton.' },
      { id: 'p_earbuds_04', name: 'Wireless Earbuds Pro', category: 'Electronics', price: 1499, oldPrice: 1999, stock: 20, sellerEmail: 'soundnest@bazaaro.test', sellerName: 'SoundNest', artSeed: 33, description: 'Crisp sound, 24-hour battery, snug fit.' },
      { id: 'p_speaker_05', name: 'Portable Bluetooth Speaker', category: 'Electronics', price: 1199, oldPrice: null, stock: 10, sellerEmail: 'soundnest@bazaaro.test', sellerName: 'SoundNest', artSeed: 44, description: 'Pocket-sized speaker with surprisingly big sound.' },
      { id: 'p_planter_06', name: 'Hand-painted Terracotta Planter', category: 'Home & Kitchen', price: 349, oldPrice: null, stock: 15, sellerEmail: 'earthen@bazaaro.test', sellerName: 'Earthen Studio', artSeed: 55, description: 'Every planter is hand-thrown and individually painted.' },
      { id: 'p_hanging_07', name: 'Woven Jute Wall Hanging', category: 'Home & Kitchen', price: 649, oldPrice: null, stock: 8, sellerEmail: 'earthen@bazaaro.test', sellerName: 'Earthen Studio', artSeed: 66, description: 'A textured, natural-fibre piece for any wall.' },
      { id: 'p_facemist_08', name: 'Rose Water Face Mist', category: 'Beauty', price: 199, oldPrice: null, stock: 30, sellerEmail: 'bloom@bazaaro.test', sellerName: 'Bloom Naturals', artSeed: 77, description: 'Steam-distilled rose water, no additives.' },
      { id: 'p_facewash_09', name: 'Herbal Face Wash 100ml', category: 'Beauty', price: 249, oldPrice: null, stock: 25, sellerEmail: 'bloom@bazaaro.test', sellerName: 'Bloom Naturals', artSeed: 88, description: 'Gentle, plant-based daily cleanser.' },
      { id: 'p_blocks_10', name: 'Wooden Building Blocks Set', category: 'Toys', price: 549, oldPrice: 799, stock: 14, sellerEmail: 'littlewonders@bazaaro.test', sellerName: 'Little Wonders', artSeed: 99, description: 'Solid wood blocks, sanded smooth and safe for little hands.' },
      { id: 'p_sandals_11', name: 'Handcrafted Leather Sandals', category: 'Footwear', price: 1099, oldPrice: null, stock: 7, sellerEmail: 'stepup@bazaaro.test', sellerName: 'StepUp Crafts', artSeed: 110, description: 'Full-grain leather, stitched and finished by hand.' },
      { id: 'p_jhumkas_12', name: 'Oxidised Silver Jhumkas', category: 'Jewelry', price: 449, oldPrice: null, stock: 3, sellerEmail: 'silverthread@bazaaro.test', sellerName: 'Silver Thread', artSeed: 121, description: 'Traditional oxidised silver earrings, made to order.' },
    ];

    for (const p of productsToSeed) {
      await execute(
        'INSERT INTO products (id, seller_email, seller_name, name, category, price, old_price, stock, description, art_seed, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [p.id, p.sellerEmail, p.sellerName, p.name, p.category, p.price, p.oldPrice, p.stock, p.description, p.artSeed, 'active', Date.now()]
      );
    }

    // Seed sample orders
    const sampleOrders = [
      { id: 'ord_101', sellerEmail: 'demo@bazaaro.test', productId: 'p_kurti_01', productName: 'Hand-block Printed Cotton Kurti', productCategory: 'Fashion', productArtSeed: 11, buyerName: 'Priya Sharma', buyerPhone: '9876543210', buyerAddress: '12 MG Road, Coimbatore', buyerPincode: '641001', qty: 1, amount: 799, status: 'pending', paymentMethod: 'cod', paymentStatus: 'pending', txnId: null, createdAt: Date.now() - 1000 * 60 * 60 * 6 },
      { id: 'ord_102', sellerEmail: 'demo@bazaaro.test', productId: 'p_dupatta_02', productName: 'Chikankari Embroidered Dupatta', productCategory: 'Fashion', productArtSeed: 22, buyerName: 'Karthik R', buyerPhone: '9876500000', buyerAddress: '4 Lake View, Chennai', buyerPincode: '600001', qty: 2, amount: 1198, status: 'confirmed', paymentMethod: 'online', paymentStatus: 'paid', txnId: 'BZR-DEMO01', createdAt: Date.now() - 1000 * 60 * 60 * 24 },
      { id: 'ord_103', sellerEmail: 'demo@bazaaro.test', productId: 'p_kurti_01', productName: 'Hand-block Printed Cotton Kurti', productCategory: 'Fashion', productArtSeed: 11, buyerName: 'Divya N', buyerPhone: '9876511111', buyerAddress: '88 Park Street, Bengaluru', buyerPincode: '560001', qty: 1, amount: 799, status: 'delivered', paymentMethod: 'cod', paymentStatus: 'pending', txnId: null, createdAt: Date.now() - 1000 * 60 * 60 * 48 },
      { id: 'ord_104', sellerEmail: 'demo@bazaaro.test', productId: 'p_palazzo_03', productName: 'Organic Cotton Palazzo Set', productCategory: 'Fashion', productArtSeed: 133, buyerName: 'Sneha K', buyerPhone: '9876522222', buyerAddress: '21 Anna Nagar, Madurai', buyerPincode: '625001', qty: 1, amount: 899, status: 'shipped', paymentMethod: 'online', paymentStatus: 'paid', txnId: 'BZR-DEMO02', createdAt: Date.now() - 1000 * 60 * 60 * 72 },
    ];

    for (const o of sampleOrders) {
      await execute(
        'INSERT INTO orders (id, seller_email, buyer_id, product_id, product_name, product_category, product_art_seed, buyer_name, buyer_phone, buyer_address, buyer_pincode, qty, amount, status, payment_method, payment_status, txn_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [o.id, o.sellerEmail, 1, o.productId, o.productName, o.productCategory, o.productArtSeed, o.buyerName, o.buyerPhone, o.buyerAddress, o.buyerPincode, o.qty, o.amount, o.status, o.paymentMethod, o.paymentStatus, o.txnId, o.createdAt]
      );

      await execute(
        'INSERT INTO payments (order_id, payment_method, payment_status, amount, txn_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [o.id, o.paymentMethod, o.paymentStatus, o.amount, o.txnId, o.createdAt]
      );
    }

    // Seed sample reviews
    await execute(
      'INSERT INTO reviews (buyer_id, buyer_name, product_id, order_id, rating, review, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [1, 'Priya Sharma', 'p_kurti_01', 'ord_103', 5, 'The fabric is genuinely soft and pure cotton. Loved the craftsmanship!', Date.now() - 1000 * 60 * 60 * 40]
    );
  }
}
