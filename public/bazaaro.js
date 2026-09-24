/* ============================================================
   BAZAARO — MASTER FULL-STACK JAVASCRIPT INTEGRATION
   Connected directly to Express + MySQL Backend
   ============================================================ */

const API_BASE = '/api';

// Generative product art palettes and patterns
const PALETTES = [
  ['#F6C9DB','#B0295C'], ['#FCE7C0','#D6901F'], ['#D9EEE1','#3F8F6E'],
  ['#DCE6FB','#3E7CDD'], ['#E9DFF5','#7C3AED'], ['#F5DCCB','#C1622E'],
];
const CATEGORY_ICON = {
  'Fashion':'👗','Electronics':'🎧','Home & Kitchen':'🏺','Beauty':'🌸',
  'Jewelry':'💍','Footwear':'👡','Grocery':'🥬','Toys':'🧸','Other':'🛍️'
};
function hashStr(s){ let h=0; for(let i=0;i<s.length;i++){ h=(h<<5)-h+s.charCodeAt(i); h|=0; } return Math.abs(h); }
function stripesSVG(pal,h){ let s=''; const angle=20+(h%40);
  for(let i=-2;i<12;i++){ s+='<rect x="'+(i*40-100)+'" y="-100" width="18" height="600" fill="'+pal[1]+'" opacity="'+(0.14+((i+h)%4)*0.07)+'" transform="rotate('+angle+' 200 200)"/>'; }
  return s; }
function dotsSVG(pal,h){ let s='';
  for(let x=20;x<400;x+=52){ for(let y=20;y<400;y+=52){ const r=6+((x+y+h)%3)*4; s+='<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+pal[1]+'" opacity="0.26"/>'; } }
  return s; }
function blobsSVG(pal,h){ let s=''; const n=5;
  for(let i=0;i<n;i++){ const cx=60+((h*(i+3))%300), cy=60+((h*(i+7))%300), r=55+((h*(i+2))%65);
    s+='<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="'+pal[1]+'" opacity="0.17"/>'; }
  return s; }
function facetsSVG(pal,h){ let s='';
  for(let i=0;i<9;i++){ const x=(i*47+(h%37))%400, y=((i*83)+(h%53))%400, size=24+((h+i)%18);
    s+='<polygon points="'+x+','+(y-size)+' '+(x+size)+','+(y+size)+' '+(x-size)+','+(y+size)+'" fill="'+pal[1]+'" opacity="0.22" transform="rotate('+((h+i*17)%360)+' '+x+' '+y+')"/>'; }
  return s; }
const PATTERN_FN = { 'Fashion':stripesSVG,'Footwear':stripesSVG,'Electronics':dotsSVG,'Toys':dotsSVG,
  'Home & Kitchen':blobsSVG,'Beauty':blobsSVG,'Grocery':blobsSVG,'Jewelry':facetsSVG,'Other':blobsSVG };

const DEFAULT_PRODUCT_IMAGES = {
  'Hand-block Printed Cotton Kurti': '/products/kurti.jpg',
  'Chikankari Embroidered Dupatta': '/products/dupatta.jpg',
  'Organic Cotton Palazzo Set': '/products/palazzo.jpg',
  'Wireless Earbuds Pro': '/products/earbuds.jpg',
  'Portable Bluetooth Speaker': '/products/speaker.jpg',
  'Hand-painted Terracotta Planter': '/products/planter.jpg',
  'Woven Jute Wall Hanging': '/products/hanging.jpg',
  'Rose Water Face Mist': '/products/facemist.jpg',
  'Herbal Face Wash 100ml': '/products/facewash.jpg',
  'Wooden Building Blocks Set': '/products/blocks.jpg',
  'Handcrafted Leather Sandals': '/products/sandals.jpg',
  'Oxidised Silver Jhumkas': '/products/jhumkas.jpg'
};

function productArtSVG(name, category, seed, imageUrl){
  const h = hashStr((name||'')+'::'+(category||'')+'::'+(seed||0));
  const pal = PALETTES[h % PALETTES.length];
  const icon = CATEGORY_ICON[category] || CATEGORY_ICON['Other'];
  const rot = (h % 16) - 8;
  const fn = PATTERN_FN[category] || blobsSVG;
  const gid = 'g'+h;
  const fallbackSvg = '<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;display:block;">'
    + '<defs><linearGradient id="'+gid+'" x1="0" y1="0" x2="1" y2="1">'
    + '<stop offset="0%" stop-color="'+pal[0]+'"/><stop offset="100%" stop-color="'+pal[1]+'" stop-opacity="0.5"/></linearGradient></defs>'
    + '<rect width="400" height="400" fill="url(#'+gid+')"/>'
    + '<g transform="rotate('+rot+' 200 200)" opacity="0.55">'+fn(pal,h)+'</g>'
    + '<circle cx="332" cy="332" r="34" fill="var(--surface)" opacity="0.95"/>'
    + '<text x="332" y="343" font-size="28" text-anchor="middle">'+icon+'</text></svg>';

  let resolvedImage = imageUrl;
  if (!resolvedImage && name) {
    if (DEFAULT_PRODUCT_IMAGES[name]) {
      resolvedImage = DEFAULT_PRODUCT_IMAGES[name];
    } else if (state && state.products) {
      const match = state.products.find(p => p.name === name);
      if (match && match.image_url) resolvedImage = match.image_url;
    }
  }

  if (resolvedImage) {
    return '<img src="'+esc(resolvedImage)+'" alt="'+esc(name||'')+'" class="product-real-img" referrerpolicy="no-referrer" onerror="this.style.display=\'none\'; if(this.nextElementSibling) this.nextElementSibling.style.display=\'block\';" />'
      + '<div class="art-fallback-box" style="display:none; width:100%; height:100%; position:absolute; inset:0;">' + fallbackSvg + '</div>';
  }
  return fallbackSvg;
}

const AVATAR_COLORS = ['#B0295C','#D6901F','#3F8F6E','#3E7CDD','#7C3AED','#C1622E'];
function avatarColor(str){ return AVATAR_COLORS[hashStr(str||'')%AVATAR_COLORS.length]; }
function money(n){ n = Math.round(n||0); return '₹'+n.toLocaleString('en-IN'); }
function esc(s){ const d=document.createElement('div'); d.textContent=s==null?'':String(s); return d.innerHTML; }

function heartIconSVG(active){
  if (active) {
    return '<svg width="19" height="19" viewBox="0 0 24 24" fill="#B0295C" stroke="#B0295C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>';
  }
  return '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#1E1B29" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>';
}

// Global State
const state = {
  screen: 'store',
  sellerPage: 'home',
  adminPage: 'overview',
  buyerProfileTab: 'profile',
  products: [],
  categories: [],
  cart: [],
  wishlist: {},
  filterCategory: null,
  searchTerm: '',
  buyer: null,
  seller: null,
  admin: null,
  token: localStorage.getItem('bzr_token') || null,
  buyerAddresses: [],
  buyerOrders: [],
  sellerOrders: [],
  sellerProducts: [],
  pv: { productId: null, qty: 1, currentReviews: [] },
  checkoutCart: []
};

// API Helper with JWT Authorization
async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) {
    headers['Authorization'] = 'Bearer ' + state.token;
  }
  const res = await fetch(API_BASE + path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Server request failed');
  }
  return data;
}

// Toast
let toastTimer;
function toastMsg(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.style.opacity = '1';
  t.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(-50%) translateY(20px)';
  }, 2600);
}

// Confetti
function celebrate() {
  const colors = ['#B0295C','#F2A93B','#3F8F6E','#3E7CDD','#7C3AED'];
  for(let i=0; i<26; i++){
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = '50%'; c.style.top = '40%';
    c.style.background = colors[i % colors.length];
    c.style.borderRadius = Math.random() > .5 ? '50%' : '2px';
    document.body.appendChild(c);
    const angle = Math.random() * Math.PI * 2, dist = 80 + Math.random() * 160;
    const dx = Math.cos(angle) * dist, dy = Math.sin(angle) * dist - 60;
    c.animate([
      { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
      { transform: 'translate('+dx+'px, '+(dy+220)+'px) rotate('+(Math.random()*400)+'deg)', opacity: 0 }
    ], { duration: 900 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.3,1)' });
    setTimeout(() => c.remove(), 1500);
  }
}

let confirmResolver = null;
function askConfirm(title, msg){
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMsg').textContent = msg;
  document.getElementById('confirmOverlay').classList.add('show');
  return new Promise((resolve) => { confirmResolver = resolve; });
}
function confirmResolve(val){
  document.getElementById('confirmOverlay').classList.remove('show');
  if(confirmResolver){ confirmResolver(val); confirmResolver=null; }
}

// Screen Routing
function showScreen(name) {
  const screens = ['store','checkout','seller-auth','seller-dashboard','admin-auth','admin-dashboard','buyer-auth','buyer-profile'];
  screens.forEach(s => {
    const el = document.getElementById('screen-' + s);
    if (el) el.classList.toggle('active', s === name);
  });
  state.screen = name;
  document.body.dataset.screen = name;
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  const navLinks = document.getElementById('navLinks');
  if (navLinks) navLinks.classList.remove('show');

  // Hide storefront header and announce bar on seller dashboard and non-storefront pages
  const isStore = (name === 'store');
  const header = document.getElementById('header');
  if (header) {
    header.classList.toggle('hide', !isStore);
  }
  const announce = document.querySelector('.announce');
  if (announce) {
    announce.classList.toggle('hide', !isStore);
  }

  if (name === 'seller-dashboard') renderSellerDashboard();
  if (name === 'admin-dashboard') renderAdminDashboard();
  if (name === 'buyer-profile') renderBuyerProfile();
}

function goSell() {
  if (state.seller) {
    showScreen('seller-dashboard');
  } else {
    showScreen('seller-auth');
  }
}

function handleUserBtnClick() {
  if (state.buyer) {
    showScreen('buyer-profile');
  } else {
    showScreen('buyer-auth');
  }
}

// ---------------- LOAD PRODUCTS FROM MYSQL ----------------
async function loadProducts() {
  try {
    let url = '/products';
    const params = [];
    if (state.filterCategory) params.push('category=' + encodeURIComponent(state.filterCategory));
    if (state.searchTerm) params.push('search=' + encodeURIComponent(state.searchTerm));
    if (params.length) url += '?' + params.join('&');

    state.products = await api(url);
    renderHeader();
    renderBento();
    renderRail();
    renderHeroCollage();
  } catch (err) {
    console.error('Failed to load products from MySQL:', err);
  }
}

function findProduct(id) {
  return state.products.find(p => p.id === id);
}

function displaySellerName(product) {
  return product.seller_shop_name || product.seller_name || 'Bazaaro Seller';
}

function clearFilterAndScroll(){
  state.filterCategory = null;
  state.searchTerm = '';
  const input = document.getElementById('searchInput');
  if (input) input.value = '';
  renderCategoryStrip();
  loadProducts();
  scrollToRail();
}

function setCategoryFilter(cat){
  if (state.filterCategory === cat) {
    state.filterCategory = null;
  } else {
    state.filterCategory = cat;
  }
  renderCategoryStrip();
  loadProducts();
  scrollToRail();
}

function onSearchInput(v){
  state.searchTerm = v.trim().toLowerCase();
  loadProducts();
}

function scrollToRail(){
  showScreen('store');
  const railSec = document.getElementById('railSection');
  if (railSec) railSec.scrollIntoView({ behavior: 'smooth' });
}

function scrollRail(dir){
  const rail = document.getElementById('productRail');
  if (rail) rail.scrollBy({ left: dir * 280, behavior: 'smooth' });
}

// ---------------- HEADER & CATEGORIES ----------------
function renderHeader() {
  const count = state.cart.reduce((a, c) => a + c.qty, 0);
  const cartEl = document.getElementById('cartCount');
  if (cartEl) {
    cartEl.textContent = count;
    cartEl.classList.toggle('show', count > 0);
  }
  const sellBtn = document.getElementById('navSellBtn');
  if (sellBtn) sellBtn.textContent = state.seller ? 'Seller Dashboard' : 'Sell on Bazaaro';

  const userBtn = document.getElementById('userBtn');
  if (userBtn) {
    if (state.buyer) {
      const initial = (state.buyer.name || 'B')[0].toUpperCase();
      userBtn.innerHTML = state.buyer.avatarUrl
        ? '<div class="user-nav-avatar"><img src="'+esc(state.buyer.avatarUrl)+'" alt="avatar"></div>'
        : '<div class="user-nav-avatar" style="background:'+avatarColor(state.buyer.email)+'">'+initial+'</div>';
      userBtn.title = state.buyer.name + ' (Buyer Profile)';
    } else {
      userBtn.innerHTML = '👤';
      userBtn.title = 'Sign In / Register';
    }
  }

  const trustSellers = document.getElementById('trustSellers');
  if (trustSellers) trustSellers.textContent = '7+';
  const trustProducts = document.getElementById('trustProducts');
  if (trustProducts) trustProducts.textContent = state.products.length + '+';
}

const CATS = ['Fashion','Electronics','Home & Kitchen','Beauty','Footwear','Grocery','Jewelry','Toys'];

const CATEGORY_IMAGES = {
  'Fashion': '/products/kurti.jpg',
  'Electronics': '/products/earbuds.jpg',
  'Home & Kitchen': '/products/hanging.jpg',
  'Beauty': '/products/facemist.jpg',
  'Footwear': '/products/sandals.jpg',
  'Grocery': '/products/grocery.jpg',
  'Jewelry': '/products/jhumkas.jpg',
  'Toys': '/products/blocks.jpg',
};

const CATEGORY_TAGLINES = {
  'Fashion': 'Handwoven & block-print',
  'Electronics': 'Artisan audio & gear',
  'Home & Kitchen': 'Macramé & pottery',
  'Beauty': 'Botanical & organic',
  'Footwear': 'Pure leather craft',
  'Grocery': 'Artisanal farm spices',
  'Jewelry': 'Oxidised silver & brass',
  'Toys': 'Safe wooden craft',
};

function renderCategoryStrip() {
  const track = document.getElementById('catTrack');
  if (!track) return;
  // Duplicate array 3 times to ensure a seamless infinite marquee loop on all screen widths
  const loopItems = [...CATS, ...CATS, ...CATS];
  track.innerHTML = loopItems.map(c => {
    const isActive = state.filterCategory === c;
    const img = CATEGORY_IMAGES[c] || '/products/kurti.jpg';
    const tag = CATEGORY_TAGLINES[c] || 'Handmade pieces';
    const icon = CATEGORY_ICON[c] || '✨';
    return '<div class="cat-card' + (isActive ? ' active' : '') + '" data-category="' + esc(c) + '" role="button" tabindex="0" title="' + (isActive ? 'Clear filter' : 'Filter by ' + esc(c)) + '">'
      + '<div class="cat-img-box">'
      + '<img src="' + esc(img) + '" alt="' + esc(c) + '" class="cat-thumb-img" loading="lazy" />'
      + '<span class="cat-badge-icon">' + icon + '</span>'
      + '</div>'
      + '<div class="cat-info">'
      + '<span class="cat-title">' + esc(c) + '</span>'
      + '<span class="cat-subtitle">' + esc(tag) + '</span>'
      + '</div>'
      + (isActive ? '<span class="cat-active-dot" title="Active filter">✓</span>' : '')
      + '</div>';
  }).join('');

  Array.from(track.querySelectorAll('.cat-card')).forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      setCategoryFilter(el.dataset.category);
    });
  });
}

function renderHeroCollage() {
  const wrap = document.getElementById('heroCollage');
  if (!wrap) return;
  const list = state.products.slice(0, 3);
  while (list.length < 3) list.push({ name: 'Bazaaro find ' + (list.length + 1), category: 'Other', art_seed: list.length });
  const cls = ['piece c1', 'piece c2', 'piece c3'];
  wrap.innerHTML = '';
  list.slice(0, 3).forEach((p, i) => {
    const d = document.createElement('div');
    d.className = cls[i];
    d.innerHTML = productArtSVG(p.name, p.category, p.art_seed || 0, p.image_url);
    wrap.appendChild(d);
  });
  const chipD = document.createElement('div'); chipD.className = 'chip discount'; chipD.innerHTML = '<span class="dot"></span>Up to 40% off';
  const chipR = document.createElement('div'); chipR.className = 'chip rating'; chipR.innerHTML = '★ 4.8 · loved by buyers';
  wrap.appendChild(chipD); wrap.appendChild(chipR);
}

// ---------------- BENTO & RAIL ----------------
function renderBento() {
  const grid = document.getElementById('bentoGrid');
  if (!grid) return;
  const items = state.products.slice(0, 4);
  if (items.length === 0) { grid.innerHTML = ''; return; }
  const layout = ['big', 'wide', '', ''];
  grid.innerHTML = items.map((p, i) => {
    const wished = !!state.wishlist[p.id];
    return '<div class="bento-card ' + (layout[i] || '') + '" onclick="openProductModal(\'' + p.id + '\')">'
      + '<div class="art-swatch" style="position:absolute;inset:0;">' + productArtSVG(p.name, p.category, p.art_seed || 0, p.image_url) + '</div>'
      + '<button class="wish-btn' + (wished ? ' active' : '') + '" onclick="event.stopPropagation(); toggleWish(\'' + p.id + '\', this)" aria-label="Add to wishlist" title="Wishlist">' + heartIconSVG(wished) + '</button>'
      + (p.stock > 0 ? '<button class="quick-add" onclick="event.stopPropagation(); quickAdd(event,\'' + p.id + '\')">+</button>' : '')
      + (p.stock <= 0 ? '<div class="sold-out-tag">Sold out</div>' : '')
      + '<div class="bento-overlay"><span class="shop">' + esc(displaySellerName(p)) + '</span><h4>' + esc(p.name) + '</h4><span class="price">' + money(p.price) + '</span></div>'
      + '</div>';
  }).join('');
}

function renderRail() {
  const rail = document.getElementById('productRail');
  if (!rail) return;
  const items = state.products;
  const heading = document.getElementById('railHeading');
  const sub = document.getElementById('railSub');
  if (state.filterCategory) {
    if (heading) heading.textContent = state.filterCategory;
    if (sub) sub.innerHTML = 'Filtered by category · <button class="clear-filter" onclick="clearFilterAndScroll()">Clear filter</button>';
  } else {
    if (heading) heading.textContent = 'Fresh off the shelf';
    if (sub) sub.textContent = 'Everything currently for sale on Bazaaro';
  }
  if (items.length === 0) {
    rail.innerHTML = '<div class="empty-catalog" style="width:100%;"><div class="emoji">🧺</div><p>No products match yet. Try a different search or category.</p></div>';
    return;
  }
  rail.innerHTML = items.map(p => {
    const wished = !!state.wishlist[p.id];
    const off = p.old_price && p.old_price > p.price ? Math.round((1 - p.price / p.old_price) * 100) : 0;
    return '<div class="rail-card" onclick="openProductModal(\'' + p.id + '\')">'
      + '<div class="img-wrap"><div class="art-swatch" style="position:absolute;inset:0;">' + productArtSVG(p.name, p.category, p.art_seed || 0, p.image_url) + '</div>'
      + (off ? '<span class="badge-off">' + off + '% OFF</span>' : '')
      + '<button class="wish-btn' + (wished ? ' active' : '') + '" style="position:absolute;top:10px;right:10px;" onclick="event.stopPropagation(); toggleWish(\'' + p.id + '\', this)" aria-label="Add to wishlist" title="Wishlist">' + heartIconSVG(wished) + '</button>'
      + (p.stock <= 0 ? '<div class="sold-out-tag">Sold out</div>' : '')
      + '</div><div class="body"><p class="shop">' + esc(displaySellerName(p)) + '</p><h5>' + esc(p.name) + '</h5>'
      + '<div class="row"><span class="price">' + money(p.price) + (off ? '<span class="old">' + money(p.old_price) + '</span>' : '') + '</span>'
      + '<button class="add-btn" ' + (p.stock <= 0 ? 'disabled' : '') + ' onclick="quickAdd(event,\'' + p.id + '\')">+</button></div></div></div>';
  }).join('');
}

// ---------------- CART (PERSISTED IN MYSQL) ----------------
async function loadCart() {
  if (!state.token || !state.buyer) {
    try { state.cart = JSON.parse(localStorage.getItem('bzr_cart') || '[]'); } catch(e) { state.cart = []; }
    renderCartDrawer();
    renderHeader();
    return;
  }
  try {
    const items = await api('/cart');
    state.cart = items.map(i => ({ productId: i.id, qty: i.qty }));
    localStorage.setItem('bzr_cart', JSON.stringify(state.cart));
    renderCartDrawer();
    renderHeader();
  } catch (err) {
    console.warn('Could not load cart from backend:', err);
  }
}

async function addToCart(id, qty = 1) {
  const p = findProduct(id);
  if (!p) return;
  const existing = state.cart.find(c => c.productId === id);
  const currentQty = existing ? existing.qty : 0;
  const newQty = Math.min(currentQty + qty, Math.max(p.stock, 0));
  if (newQty <= currentQty) {
    toastMsg('Only ' + p.stock + ' left in stock');
    return;
  }

  if (existing) existing.qty = newQty;
  else state.cart.push({ productId: id, qty: newQty });

  localStorage.setItem('bzr_cart', JSON.stringify(state.cart));
  renderCartDrawer();
  renderHeader();

  if (state.token && state.buyer) {
    try {
      await api('/cart/items', { method: 'POST', body: JSON.stringify({ productId: id, qty }) });
    } catch (err) {
      console.warn('Error syncing cart to backend:', err);
    }
  }
}

async function changeCartQty(id, delta) {
  const item = state.cart.find(c => c.productId === id);
  if (!item) return;
  const p = findProduct(id);
  const max = p ? p.stock : 99;
  item.qty += delta;
  if (item.qty > max) item.qty = max;
  if (item.qty <= 0) {
    state.cart = state.cart.filter(c => c.productId !== id);
  }
  localStorage.setItem('bzr_cart', JSON.stringify(state.cart));
  renderCartDrawer();
  renderHeader();

  if (state.token && state.buyer) {
    try {
      await api('/cart/items/' + id, { method: 'PUT', body: JSON.stringify({ qty: item.qty }) });
    } catch (err) {
      console.warn('Error updating cart on backend:', err);
    }
  }
}

async function removeFromCart(id) {
  state.cart = state.cart.filter(c => c.productId !== id);
  localStorage.setItem('bzr_cart', JSON.stringify(state.cart));
  renderCartDrawer();
  renderHeader();

  if (state.token && state.buyer) {
    try {
      await api('/cart/items/' + id, { method: 'DELETE' });
    } catch (err) {
      console.warn('Error removing from cart on backend:', err);
    }
  }
}

function cartTotal() {
  return state.cart.reduce((sum, c) => {
    const p = findProduct(c.productId);
    return sum + (p ? p.price * c.qty : 0);
  }, 0);
}

function renderCartDrawer() {
  const body = document.getElementById('drawerBody');
  if (!body) return;
  const validCart = state.cart.filter(c => !!findProduct(c.productId));
  if (validCart.length !== state.cart.length) {
    state.cart = validCart;
    localStorage.setItem('bzr_cart', JSON.stringify(state.cart));
  }
  if (state.cart.length === 0) {
    body.innerHTML = '<div class="drawer-empty">Your cart is empty.<br>Start adding things you love ✨</div>';
  } else {
    body.innerHTML = state.cart.map(c => {
      const p = findProduct(c.productId);
      return '<div class="drawer-item"><div class="thumb">' + productArtSVG(p.name, p.category, p.art_seed || 0, p.image_url) + '</div>'
        + '<div class="info"><div class="name">' + esc(p.name) + '</div><div class="shop">' + esc(displaySellerName(p)) + '</div>'
        + '<div class="qty-row"><button class="qty-btn" onclick="changeCartQty(\'' + p.id + '\',-1)">−</button><span>' + c.qty + '</span>'
        + '<button class="qty-btn" onclick="changeCartQty(\'' + p.id + '\',1)">+</button><button class="remove-item" onclick="removeFromCart(\'' + p.id + '\')">Remove</button></div>'
        + '<div class="price">' + money(p.price * c.qty) + '</div></div></div>';
    }).join('');
  }
  const sub = document.getElementById('drawerSubtotal');
  if (sub) sub.textContent = money(cartTotal());
  const chkBtn = document.getElementById('drawerCheckoutBtn');
  if (chkBtn) chkBtn.disabled = state.cart.length === 0;
}

function openDrawer() {
  document.getElementById('drawer')?.classList.add('show');
  document.getElementById('overlay')?.classList.add('show');
}
function closeDrawer() {
  document.getElementById('drawer')?.classList.remove('show');
  document.getElementById('overlay')?.classList.remove('show');
}

function quickAdd(e, id) {
  e.stopPropagation();
  addToCart(id, 1);
  const p = findProduct(id);
  const cartIcon = document.getElementById('cartIcon');
  if (cartIcon) {
    const iconRect = cartIcon.getBoundingClientRect();
    const start = e.currentTarget.getBoundingClientRect();
    const dot = document.createElement('div');
    dot.className = 'fly-dot';
    dot.style.left = (start.left + start.width / 2) + 'px';
    dot.style.top = (start.top + start.height / 2) + 'px';
    document.body.appendChild(dot);
    requestAnimationFrame(() => {
      dot.style.transition = 'all .6s cubic-bezier(.2,.8,.2,1)';
      dot.style.left = (iconRect.left + iconRect.width / 2) + 'px';
      dot.style.top = (iconRect.top + iconRect.height / 2) + 'px';
      dot.style.transform = 'scale(.3)';
      dot.style.opacity = '.4';
    });
    setTimeout(() => dot.remove(), 650);
  }
  toastMsg((p ? p.name : 'Item') + ' added to cart');
}

// ---------------- WISHLIST (PERSISTED IN MYSQL) ----------------
async function loadWishlist() {
  if (!state.token || !state.buyer) {
    try { state.wishlist = JSON.parse(localStorage.getItem('bzr_wish') || '{}'); } catch(e) { state.wishlist = {}; }
    return;
  }
  try {
    const items = await api('/buyers/wishlist');
    state.wishlist = {};
    items.forEach(i => { state.wishlist[i.id] = true; });
    localStorage.setItem('bzr_wish', JSON.stringify(state.wishlist));
    renderBento();
    renderRail();
  } catch (err) {
    console.warn('Failed to load wishlist:', err);
  }
}

async function toggleWish(id, btn) {
  state.wishlist[id] = !state.wishlist[id];
  localStorage.setItem('bzr_wish', JSON.stringify(state.wishlist));

  if (btn) {
    btn.classList.toggle('active', !!state.wishlist[id]);
    btn.innerHTML = heartIconSVG(!!state.wishlist[id]);
    btn.classList.add('pop');
    setTimeout(() => btn.classList.remove('pop'), 400);
  }

  toastMsg(state.wishlist[id] ? 'Added to wishlist 💗' : 'Removed from wishlist');

  if (state.token && state.buyer) {
    try {
      if (state.wishlist[id]) {
        await api('/buyers/wishlist/' + id, { method: 'POST' });
      } else {
        await api('/buyers/wishlist/' + id, { method: 'DELETE' });
      }
    } catch (err) {
      console.warn('Failed to sync wishlist to backend:', err);
    }
  }
}

// ---------------- PRODUCT QUICK VIEW MODAL & REVIEWS ----------------
async function openProductModal(id) {
  const p = findProduct(id);
  if (!p) return;
  state.pv.productId = id;
  state.pv.qty = 1;

  document.getElementById('pvArt').innerHTML = productArtSVG(p.name, p.category, p.art_seed || 0, p.image_url);
  document.getElementById('pvShop').textContent = 'Sold by ' + displaySellerName(p);
  document.getElementById('pvName').textContent = p.name;
  document.getElementById('pvPrice').textContent = money(p.price);
  document.getElementById('pvOld').textContent = p.old_price && p.old_price > p.price ? money(p.old_price) : '';
  document.getElementById('pvDesc').textContent = p.description || ('A thoughtfully made ' + p.category.toLowerCase() + ' piece from an independent Bazaaro seller.');

  const stockEl = document.getElementById('pvStock');
  if (p.stock <= 0) {
    stockEl.textContent = 'Currently sold out';
    stockEl.style.color = 'var(--danger)';
  } else if (p.stock <= 3) {
    stockEl.textContent = 'Only ' + p.stock + ' left in stock';
    stockEl.style.color = 'var(--accent-dark)';
  } else {
    stockEl.textContent = p.stock + ' in stock';
    stockEl.style.color = 'var(--sage)';
  }

  document.getElementById('pvQty').textContent = state.pv.qty;
  document.getElementById('pvQtyWrap').style.display = p.stock > 0 ? 'flex' : 'none';
  document.getElementById('pvAddBtn').style.display = p.stock > 0 ? 'inline-flex' : 'none';
  document.getElementById('pvBuyBtn').style.display = p.stock > 0 ? 'inline-flex' : 'none';

  // Load reviews from API
  try {
    const reviews = await api('/reviews/product/' + id);
    state.pv.currentReviews = reviews;
    renderProductReviews(reviews);
  } catch (e) {
    renderProductReviews([]);
  }

  document.getElementById('pvOverlay').classList.add('show');
}

function renderProductReviews(reviews) {
  let container = document.getElementById('pvReviewsList');
  if (!container) return;
  if (!reviews || reviews.length === 0) {
    container.innerHTML = '<p style="color:var(--ink-soft); font-size:.82rem;">No buyer reviews yet. Be the first to review after purchasing!</p>';
    return;
  }
  container.innerHTML = reviews.map(r => {
    const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
    const dateStr = new Date(Number(r.created_at)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    return '<div class="review-item"><div class="review-head"><span>' + esc(r.buyer_name) + '</span><span class="review-stars">' + stars + '</span></div>'
      + '<p style="margin-bottom:2px;">' + esc(r.review) + '</p>'
      + '<div style="font-size:.72rem; color:var(--ink-soft);">' + dateStr + '</div></div>';
  }).join('');
}

function closeProductModal() {
  document.getElementById('pvOverlay')?.classList.remove('show');
}

function changePvQty(delta) {
  const p = findProduct(state.pv.productId);
  if (!p) return;
  state.pv.qty = Math.max(1, Math.min(p.stock, state.pv.qty + delta));
  document.getElementById('pvQty').textContent = state.pv.qty;
}

function pvAddToCart() {
  addToCart(state.pv.productId, state.pv.qty);
  closeProductModal();
  openDrawer();
}

function pvBuyNow() {
  addToCart(state.pv.productId, state.pv.qty);
  closeProductModal();
  goToCheckout();
}

// ---------------- CHECKOUT (WITH REAL BACKEND MYSQL RECORDING) ----------------
let checkoutPayMethod = 'cod';
let checkoutOnlineTab = 'upi';

function selectPayMethod(method) {
  checkoutPayMethod = method;
  document.getElementById('payOptCod').classList.toggle('active', method === 'cod');
  document.getElementById('payOptOnline').classList.toggle('active', method === 'online');
  document.getElementById('paySubOnline').classList.toggle('active', method === 'online');
  document.getElementById('checkoutSubmitBtn').textContent = method === 'online' ? 'Pay & place order' : 'Place order';
}

function selectOnlineTab(tab) {
  checkoutOnlineTab = tab;
  document.getElementById('upiTab').classList.toggle('active', tab === 'upi');
  document.getElementById('cardTab').classList.toggle('active', tab === 'card');
  document.getElementById('upiFields').classList.toggle('hide', tab !== 'upi');
  document.getElementById('cardFields').classList.toggle('hide', tab !== 'card');
}

async function goToCheckout() {
  if (state.cart.length === 0) {
    toastMsg('Your cart is empty');
    return;
  }
  closeDrawer();
  state.checkoutCart = state.cart.map(c => ({ ...c }));
  renderCheckoutSummary();

  document.getElementById('checkoutForm').classList.remove('hide');
  document.getElementById('payProcessing').classList.add('hide');
  document.getElementById('checkoutFormWrap').classList.remove('hide');
  document.getElementById('checkoutSuccessWrap').classList.add('hide');
  document.getElementById('checkoutMsg').classList.remove('show');
  selectPayMethod('cod');
  selectOnlineTab('upi');

  // Pre-fill buyer details if logged in
  if (state.buyer) {
    const nameInput = document.getElementById('cfName');
    const phoneInput = document.getElementById('cfPhone');
    if (nameInput && state.buyer.name) nameInput.value = state.buyer.name;
    if (phoneInput && state.buyer.phone) phoneInput.value = state.buyer.phone;

    // Load default address
    try {
      const addresses = await api('/buyers/addresses');
      const defAddr = addresses.find(a => a.is_default) || addresses[0];
      if (defAddr) {
        document.getElementById('cfPincode').value = defAddr.pincode;
        document.getElementById('cfAddress').value = defAddr.address_line;
        if (defAddr.phone) phoneInput.value = defAddr.phone;
        if (defAddr.full_name) nameInput.value = defAddr.full_name;
      }
    } catch (e) {}
  }

  showScreen('checkout');
}

function renderCheckoutSummary() {
  const wrap = document.getElementById('checkoutSummaryItems');
  if (!wrap) return;
  wrap.innerHTML = state.checkoutCart.map(c => {
    const p = findProduct(c.productId);
    if (!p) return '';
    return '<div class="summary-item"><div class="thumb">' + productArtSVG(p.name, p.category, p.art_seed || 0, p.image_url) + '</div>'
      + '<div class="info"><div class="n">' + esc(p.name) + '</div><div class="m">Qty ' + c.qty + ' · ' + esc(displaySellerName(p)) + '</div></div>'
      + '<div style="font-weight:700; font-size:.88rem;">' + money(p.price * c.qty) + '</div></div>';
  }).join('');
  const total = state.checkoutCart.reduce((sum, c) => {
    const p = findProduct(c.productId);
    return sum + (p ? p.price * c.qty : 0);
  }, 0);
  document.getElementById('checkoutTotal').textContent = money(total);
}

function wait(ms){ return new Promise(res => setTimeout(res, ms)); }

async function submitCheckout(e) {
  e.preventDefault();
  const name = document.getElementById('cfName').value.trim();
  const phone = document.getElementById('cfPhone').value.trim();
  const pincode = document.getElementById('cfPincode').value.trim();
  const address = document.getElementById('cfAddress').value.trim();
  const msgEl = document.getElementById('checkoutMsg');

  if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
    msgEl.textContent = 'Please enter a valid 10-digit phone number.';
    msgEl.classList.add('show');
    return;
  }
  if (!/^\d{4,8}$/.test(pincode)) {
    msgEl.textContent = 'Please enter a valid pincode.';
    msgEl.classList.add('show');
    return;
  }

  const onlineDetails = {};
  if (checkoutPayMethod === 'online') {
    if (checkoutOnlineTab === 'upi') {
      const upi = document.getElementById('cfUpi').value.trim();
      if (!/^[\w.\-]{2,}@[\w]{2,}$/.test(upi)) {
        msgEl.textContent = 'Please enter a valid UPI ID (e.g. name@upi).';
        msgEl.classList.add('show');
        return;
      }
      onlineDetails.type = 'upi';
      onlineDetails.upiId = upi;
    } else {
      const cardNum = document.getElementById('cfCardNum').value.replace(/\s+/g, '');
      const exp = document.getElementById('cfCardExp').value.trim();
      const cvv = document.getElementById('cfCardCvv').value.trim();
      if (!/^\d{12,19}$/.test(cardNum)) {
        msgEl.textContent = 'Please enter a valid card number.';
        msgEl.classList.add('show');
        return;
      }
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(exp)) {
        msgEl.textContent = 'Please enter a valid expiry (MM/YY).';
        msgEl.classList.add('show');
        return;
      }
      if (!/^\d{3,4}$/.test(cvv)) {
        msgEl.textContent = 'Please enter a valid CVV.';
        msgEl.classList.add('show');
        return;
      }
      onlineDetails.type = 'card';
      onlineDetails.cardNumber = cardNum;
      onlineDetails.expiry = exp;
      onlineDetails.cvv = cvv;
    }
  }

  msgEl.classList.remove('show');
  const btn = document.getElementById('checkoutSubmitBtn');
  btn.disabled = true;
  btn.textContent = checkoutPayMethod === 'online' ? 'Processing…' : 'Placing order…';

  if (checkoutPayMethod === 'online') {
    document.getElementById('checkoutForm').classList.add('hide');
    const proc = document.getElementById('payProcessing');
    document.getElementById('payProcessingText').textContent = 'Processing your payment securely…';
    proc.classList.remove('hide');
    await wait(1200);
    document.getElementById('payProcessingText').textContent = 'Payment confirmed ✓ Creating order in database…';
    await wait(400);
  }

  try {
    const payload = {
      buyerName: name,
      buyerPhone: phone,
      buyerPincode: pincode,
      buyerAddress: address,
      items: state.checkoutCart,
      paymentMethod: checkoutPayMethod,
      onlineDetails
    };

    const res = await api('/orders', { method: 'POST', body: JSON.stringify(payload) });

    // Refresh products to show updated stock in real-time
    await loadProducts();

    // Clear local cart
    state.cart = [];
    localStorage.removeItem('bzr_cart');
    renderCartDrawer();
    renderHeader();

    document.getElementById('checkoutFormWrap').classList.add('hide');
    document.getElementById('checkoutSuccessWrap').classList.remove('hide');
    document.getElementById('successMsg').textContent = checkoutPayMethod === 'online'
      ? 'Payment received (' + (res.txnId || '') + ') — thank you for shopping small! Your order is saved in the database and sellers have been notified.'
      : 'Thank you for shopping small! Your order has been placed via Cash on Delivery and sellers will ship soon.';

    celebrate();
    document.getElementById('checkoutForm').reset();
    document.getElementById('checkoutForm').classList.remove('hide');
    document.getElementById('payProcessing').classList.add('hide');
  } catch (err) {
    console.error(err);
    document.getElementById('checkoutForm').classList.remove('hide');
    document.getElementById('payProcessing').classList.add('hide');
    msgEl.textContent = err.message || "We couldn't place your order just now. Please try again.";
    msgEl.classList.add('show');
  }

  btn.disabled = false;
  btn.textContent = checkoutPayMethod === 'online' ? 'Pay & place order' : 'Place order';
}

// ---------------- BUYER AUTH & PROFILE (MYSQL POWERED) ----------------
function switchBuyerAuthTab(mode) {
  document.getElementById('tabBuyerLogin')?.classList.toggle('active', mode === 'login');
  document.getElementById('tabBuyerSignup')?.classList.toggle('active', mode === 'signup');
  document.getElementById('buyerLoginForm')?.classList.toggle('active', mode === 'login');
  document.getElementById('buyerSignupForm')?.classList.toggle('active', mode === 'signup');
  document.getElementById('buyerAuthTitle').textContent = mode === 'login' ? 'Welcome back, Buyer' : 'Create a buyer account';
  document.getElementById('buyerAuthSub').textContent = mode === 'login' ? 'Log in to view your orders, addresses, and wishlist.' : 'Shop small, save your favorite makers, and track orders.';
  document.getElementById('buyerAuthMsg')?.classList.remove('show');
}

function fillBuyerDemoCreds() {
  switchBuyerAuthTab('login');
  document.getElementById('buyerLoginEmail').value = 'buyer@bazaaro.test';
  document.getElementById('buyerLoginPassword').value = 'buyer1234';
  toastMsg('Demo buyer details filled in — hit Log in');
}

function showBuyerAuthMsg(msg) {
  const el = document.getElementById('buyerAuthMsg');
  if (el) { el.textContent = msg; el.classList.add('show'); }
}

async function submitBuyerLogin(e) {
  e.preventDefault();
  const email = document.getElementById('buyerLoginEmail').value.trim().toLowerCase();
  const password = document.getElementById('buyerLoginPassword').value;
  const msgEl = document.getElementById('buyerAuthMsg');
  msgEl.classList.remove('show');
  const btn = document.getElementById('buyerLoginBtn');
  btn.disabled = true;
  btn.textContent = 'Logging in…';

  try {
    const res = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, requestedRole: 'BUYER' })
    });

    state.token = res.token;
    localStorage.setItem('bzr_token', res.token);
    state.buyer = res.user;

    await loadCart();
    await loadWishlist();
    renderHeader();
    toastMsg('Welcome back, ' + (res.user.name || 'buyer') + '! 🎉');
    showScreen('buyer-profile');
  } catch (err) {
    showBuyerAuthMsg(err.message || 'Login failed. Please check your credentials.');
  }

  btn.disabled = false;
  btn.textContent = 'Log in';
}

async function submitBuyerSignup(e) {
  e.preventDefault();
  const name = document.getElementById('buyerSignupName').value.trim();
  const email = document.getElementById('buyerSignupEmail').value.trim().toLowerCase();
  const phone = document.getElementById('buyerSignupPhone').value.trim();
  const password = document.getElementById('buyerSignupPassword').value;

  const msgEl = document.getElementById('buyerAuthMsg');
  msgEl.classList.remove('show');

  if (password.length < 6) {
    showBuyerAuthMsg('Password must be at least 6 characters.');
    return;
  }

  const btn = document.getElementById('buyerSignupBtn');
  btn.disabled = true;
  btn.textContent = 'Creating account…';

  try {
    const res = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, phone, password, role: 'BUYER' })
    });

    state.token = res.token;
    localStorage.setItem('bzr_token', res.token);
    state.buyer = res.user;

    await loadCart();
    await loadWishlist();
    renderHeader();
    celebrate();
    toastMsg('Welcome to Bazaaro, ' + name + '! 🎉');
    showScreen('buyer-profile');
  } catch (err) {
    showBuyerAuthMsg(err.message || 'Registration failed');
  }

  btn.disabled = false;
  btn.textContent = 'Create account';
}

function logoutBuyer() {
  state.buyer = null;
  state.token = null;
  localStorage.removeItem('bzr_token');
  state.cart = [];
  renderHeader();
  renderCartDrawer();
  showScreen('store');
  toastMsg('Logged out of buyer account');
}

// Buyer Profile Navigation Tabs
function showBuyerProfileTab(tabName) {
  state.buyerProfileTab = tabName;
  ['profile', 'addresses', 'orders', 'wishlist'].forEach(t => {
    document.getElementById('bp-page-' + t)?.classList.toggle('active', t === tabName);
    document.getElementById('bp-tab-' + t)?.classList.toggle('active', t === tabName);
  });
  if (tabName === 'addresses') renderBuyerAddresses();
  if (tabName === 'orders') renderBuyerOrders();
  if (tabName === 'wishlist') renderBuyerWishlist();
}

async function renderBuyerProfile() {
  if (!state.buyer) {
    showScreen('buyer-auth');
    return;
  }

  try {
    const profile = await api('/buyers/profile');
    state.buyer = { ...state.buyer, ...profile };
  } catch (e) {}

  const b = state.buyer;
  document.getElementById('bpNameLabel').textContent = b.name || 'Buyer';
  document.getElementById('bpEmailLabel').textContent = b.email || '';
  const initial = (b.name || 'B')[0].toUpperCase();

  const avatarEl = document.getElementById('bpAvatar');
  if (avatarEl) {
    avatarEl.style.background = avatarColor(b.email);
    avatarEl.innerHTML = b.avatarUrl ? '<img src="' + esc(b.avatarUrl) + '" alt="Avatar">' : initial;
  }

  const prevAvatarEl = document.getElementById('bpAvatarPreview');
  if (prevAvatarEl) {
    prevAvatarEl.style.background = avatarColor(b.email);
    prevAvatarEl.innerHTML = b.avatarUrl ? '<img src="' + esc(b.avatarUrl) + '" alt="Avatar">' : initial;
  }

  document.getElementById('bpEditName').value = b.name || '';
  document.getElementById('bpEditEmail').value = b.email || '';
  document.getElementById('bpEditPhone').value = b.phone || '';
  document.getElementById('bpEditAvatar').value = b.avatarUrl || '';

  showBuyerProfileTab(state.buyerProfileTab || 'profile');
}

async function submitBuyerProfileUpdate(e) {
  e.preventDefault();
  const name = document.getElementById('bpEditName').value.trim();
  const phone = document.getElementById('bpEditPhone').value.trim();
  const avatarUrl = document.getElementById('bpEditAvatar').value.trim();
  const msgEl = document.getElementById('bpProfileMsg');

  if (!name) {
    toastMsg('Name cannot be empty');
    return;
  }

  try {
    const res = await api('/buyers/profile', {
      method: 'PUT',
      body: JSON.stringify({ name, phone, avatarUrl })
    });
    state.buyer = { ...state.buyer, ...res.buyer };
    msgEl.textContent = 'Profile updated and saved to MySQL!';
    msgEl.classList.add('show');
    setTimeout(() => msgEl.classList.remove('show'), 2500);
    renderHeader();
    renderBuyerProfile();
    celebrate();
    toastMsg('Profile updated ✨');
  } catch (err) {
    toastMsg(err.message || 'Failed to update profile');
  }
}

// Addresses Management
async function renderBuyerAddresses() {
  const container = document.getElementById('bpAddressList');
  if (!container) return;
  try {
    const list = await api('/buyers/addresses');
    state.buyerAddresses = list;
    if (list.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="emoji">🏡</div><p>No saved addresses yet. Add your delivery address below!</p></div>';
      return;
    }
    container.innerHTML = list.map(a => {
      return '<div class="address-card ' + (a.is_default ? 'default' : '') + '">'
        + '<div class="row"><div><span class="tag-badge">' + esc(a.tag || 'Home') + (a.is_default ? ' · Default' : '') + '</span>'
        + '<h4 style="font-size:.95rem; margin-bottom:4px;">' + esc(a.full_name) + ' (' + esc(a.phone) + ')</h4>'
        + '<p style="color:var(--ink-soft); font-size:.85rem; line-height:1.5;">' + esc(a.address_line) + '<br>Pincode: <strong>' + esc(a.pincode) + '</strong></p></div></div>'
        + '<div class="actions">'
        + (!a.is_default ? '<button class="mini-btn" onclick="setDefaultAddress(' + a.id + ')">Set Default</button>' : '')
        + '<button class="mini-btn danger" onclick="deleteAddress(' + a.id + ')">Remove</button>'
        + '</div></div>';
    }).join('');
  } catch (err) {
    container.innerHTML = '<p class="field-error">Failed to load addresses</p>';
  }
}

async function submitNewAddress(e) {
  e.preventDefault();
  const fullName = document.getElementById('newAddrName').value.trim();
  const phone = document.getElementById('newAddrPhone').value.trim();
  const pincode = document.getElementById('newAddrPincode').value.trim();
  const addressLine = document.getElementById('newAddrLine').value.trim();
  const tag = document.getElementById('newAddrTag').value;
  const isDefault = document.getElementById('newAddrDefault').checked ? 1 : 0;

  try {
    await api('/buyers/addresses', {
      method: 'POST',
      body: JSON.stringify({ fullName, phone, pincode, addressLine, tag, isDefault })
    });
    toastMsg('Address saved to MySQL database');
    document.getElementById('newAddressForm').reset();
    renderBuyerAddresses();
  } catch (err) {
    toastMsg(err.message || 'Failed to save address');
  }
}

async function setDefaultAddress(id) {
  try {
    await api('/buyers/addresses/' + id + '/default', { method: 'PUT' });
    toastMsg('Default address updated');
    renderBuyerAddresses();
  } catch (e) {
    toastMsg('Failed to set default address');
  }
}

async function deleteAddress(id) {
  const ok = await askConfirm('Delete this address?', 'This will be permanently removed from your saved addresses.');
  if (!ok) return;
  try {
    await api('/buyers/addresses/' + id, { method: 'DELETE' });
    toastMsg('Address deleted');
    renderBuyerAddresses();
  } catch (e) {
    toastMsg('Failed to delete address');
  }
}

// Buyer Order History
async function renderBuyerOrders() {
  const container = document.getElementById('bpOrdersList');
  if (!container) return;
  try {
    const orders = await api('/buyers/orders');
    state.buyerOrders = orders;
    if (orders.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="emoji">🛍️</div><p>No orders placed yet. Fresh finds are waiting on the storefront!</p></div>';
      return;
    }

    container.innerHTML = orders.map(o => {
      const dateStr = new Date(Number(o.created_at)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      const payBadge = o.payment_method === 'online' ? '<span class="badge paid">Paid online</span>' : '<span class="badge cod">COD</span>';
      const prod = findProduct(o.product_id);
      const prodImg = (prod && prod.image_url) || o.product_image_url || null;
      return '<div class="order-card">'
        + '<div class="thumb">' + productArtSVG(o.product_name, o.product_category || 'Other', o.product_art_seed || 0, prodImg) + '</div>'
        + '<div class="order-info"><div class="top">' + esc(o.product_name) + ' <span class="status-pill ' + o.status + '">' + o.status + '</span> ' + payBadge + '</div>'
        + '<div class="sub">Order ID: ' + esc(o.id) + ' · Date: ' + dateStr + '<br>Qty: ' + o.qty + ' · Total: ' + money(o.amount) + ' · Delivered to: ' + esc(o.buyer_pincode) + '</div></div>'
        + (o.status === 'delivered' ? '<button class="btn btn-ghost btn-sm" onclick="openReviewModal(\'' + o.product_id + '\',\'' + esc(o.product_name) + '\',\'' + o.id + '\')">★ Review Item</button>' : '')
        + '</div>';
    }).join('');
  } catch (err) {
    container.innerHTML = '<p class="field-error">Failed to load order history</p>';
  }
}

// Buyer Wishlist tab
async function renderBuyerWishlist() {
  const grid = document.getElementById('bpWishlistGrid');
  if (!grid) return;
  try {
    const list = await api('/buyers/wishlist');
    if (list.length === 0) {
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><div class="emoji">♡</div><p>Your wishlist is currently empty. Tap the heart on products you love!</p></div>';
      return;
    }
    grid.innerHTML = list.map(p => {
      return '<div class="rail-card">'
        + '<div class="img-wrap"><div class="art-swatch" style="position:absolute;inset:0;">' + productArtSVG(p.name, p.category, p.art_seed || 0, p.image_url) + '</div>'
        + '<button class="wish-btn active" style="position:absolute;top:10px;right:10px;" onclick="toggleWish(\'' + p.id + '\', this); setTimeout(renderBuyerWishlist, 300);" aria-label="Remove from wishlist" title="Remove from wishlist">' + heartIconSVG(true) + '</button></div>'
        + '<div class="body"><p class="shop">' + esc(p.category) + '</p><h5>' + esc(p.name) + '</h5>'
        + '<div class="row"><span class="price">' + money(p.price) + '</span>'
        + '<button class="btn btn-primary btn-sm" onclick="addToCart(\'' + p.id + '\', 1); openDrawer();">Add to cart</button></div></div></div>';
    }).join('');
  } catch (err) {
    grid.innerHTML = '<p class="field-error">Failed to load wishlist</p>';
  }
}

// ---------------- REVIEWS MODAL ----------------
let reviewModalData = { productId: '', orderId: '' };
function openReviewModal(productId, productName, orderId) {
  reviewModalData = { productId, orderId };
  document.getElementById('revProductName').textContent = productName;
  document.getElementById('revOrderMsg').classList.remove('show');
  document.getElementById('reviewForm').reset();
  document.getElementById('reviewModal').classList.add('show');
}
function closeReviewModal() {
  document.getElementById('reviewModal').classList.remove('show');
}
async function submitReviewForm(e) {
  e.preventDefault();
  const rating = document.getElementById('revRating').value;
  const reviewText = document.getElementById('revText').value.trim();
  const msgEl = document.getElementById('revOrderMsg');

  try {
    await api('/reviews', {
      method: 'POST',
      body: JSON.stringify({
        productId: reviewModalData.productId,
        orderId: reviewModalData.orderId,
        rating,
        review: reviewText
      })
    });
    toastMsg('Review submitted! Thank you for supporting independent makers 🌟');
    closeReviewModal();
  } catch (err) {
    msgEl.textContent = err.message || 'Failed to submit review';
    msgEl.classList.add('show');
  }
}

// ---------------- SELLER DASHBOARD (MYSQL INTEGRATION) ----------------
function toggleSidebar(show) {
  document.getElementById('dashSidebar')?.classList.toggle('show', show);
  document.getElementById('sidebarScrim')?.classList.toggle('show', show);
}
const SELLER_PAGE_TEXT = {
  home: ['Good day! ☀️', "Here's how your shop is doing."],
  products: ['My Products', 'Everything you sell, in one place'],
  orders: ['Orders', 'Orders from your buyers'],
  profile: ['Shop Profile', 'This is what buyers see about your shop'],
};
function showSellerPage(name) {
  state.sellerPage = name;
  document.querySelectorAll('#screen-seller-dashboard .dash-page').forEach(p => p.classList.remove('active'));
  document.getElementById('dpage-' + name)?.classList.add('active');
  document.querySelectorAll('#screen-seller-dashboard .nav-link').forEach(l => l.classList.toggle('active', l.dataset.page === name));
  document.getElementById('dashPageTitle').textContent = SELLER_PAGE_TEXT[name][0];
  document.getElementById('dashPageSub').textContent = SELLER_PAGE_TEXT[name][1];
  toggleSidebar(false);
}

async function renderSellerDashboard() {
  if (!state.seller) {
    showScreen('seller-auth');
    return;
  }
  try {
    const s = await api('/seller/profile');
    state.seller = { ...state.seller, ...s };
  } catch (e) {}

  const s = state.seller;
  document.getElementById('sellerAvatar').textContent = (s.shop_name || 'S')[0].toUpperCase();
  document.getElementById('sellerAvatar').style.background = avatarColor(s.email);
  document.getElementById('sellerNameLabel').textContent = s.shop_name || 'Seller';
  document.getElementById('sellerSinceLabel').textContent = 'Seller since ' + new Date(Number(s.created_at || Date.now())).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  document.getElementById('suspendBanner').classList.toggle('hide', s.status !== 'suspended');

  await Promise.all([loadSellerProducts(), loadSellerOrders()]);
  renderSellerHome();
  renderSellerProfileForm();
  showSellerPage(state.sellerPage || 'home');
}

async function loadSellerProducts() {
  try {
    state.sellerProducts = await api('/seller/products');
    renderSellerProducts();
  } catch (err) {
    console.error('Failed to load seller products:', err);
  }
}

async function loadSellerOrders() {
  try {
    state.sellerOrders = await api('/seller/orders');
    renderSellerOrders();
  } catch (err) {
    console.error('Failed to load seller orders:', err);
  }
}

function renderSellerHome() {
  const products = state.sellerProducts;
  const orders = state.sellerOrders;
  const now = new Date();
  const thisMonthOrders = orders.filter(o => {
    const d = new Date(Number(o.created_at || 0));
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const earned = thisMonthOrders.filter(o => o.status === 'delivered').reduce((a, o) => a + (Number(o.amount) || 0), 0);
  const pending = orders.filter(o => o.status !== 'delivered');
  const lowStock = products.filter(p => p.stock > 0 && p.stock <= 3).length;

  document.getElementById('statRow').innerHTML = [
    { icon: '💰', bg: 'var(--sage-bg)', color: 'var(--sage)', value: money(earned), label: 'Earned this month', note: earned > 0 ? 'Nice work! 🎉' : 'Ship an order to see this grow' },
    { icon: '🧾', bg: 'var(--sky-bg)', color: 'var(--sky)', value: thisMonthOrders.length, label: 'Orders this month', note: thisMonthOrders.length > 0 ? 'Keep it up' : 'No orders yet this month' },
    { icon: '⏳', bg: '#FDF0DC', color: 'var(--accent-dark)', value: pending.length, label: 'Waiting to be shipped', note: pending.length > 0 ? 'Ship these today 👇' : 'You\'re all caught up' },
    { icon: '🗂️', bg: 'var(--lav-bg)', color: 'var(--lav)', value: products.length, label: 'Products listed', note: lowStock > 0 ? (lowStock + ' running low on stock') : 'Stock levels look healthy' }
  ].map((c, i) => {
    return '<div class="stat-card" style="animation-delay:' + (i * 0.05) + 's"><div class="stat-icon" style="background:' + c.bg + ';color:' + c.color + ';">' + c.icon + '</div>'
      + '<p class="stat-value">' + c.value + '</p><p class="stat-label">' + c.label + '</p><p class="stat-note" style="color:' + c.color + ';">' + c.note + '</p></div>';
  }).join('');

  document.getElementById('pendingOrdersNote').textContent = pending.length + ' order' + (pending.length === 1 ? '' : 's') + ' waiting';

  const needAttention = orders.filter(o => o.status !== 'delivered').slice(0, 3);
  document.getElementById('dashOrders').innerHTML = needAttention.length
    ? needAttention.map(orderCardHTML).join('')
    : '<div class="empty-state"><div class="emoji">🎉</div><p>You\'re all caught up!</p></div>';

  const checks = [
    { label: 'Create your account', done: true },
    { label: 'Write your shop story', done: !!(state.seller.about && state.seller.about.trim().length > 10) },
    { label: 'Add your first product', done: products.length >= 1 },
    { label: 'List 3 or more products', done: products.length >= 3 },
  ];
  const done = checks.filter(c => c.done).length;
  const pct = Math.round(done / checks.length * 100);
  document.getElementById('onboardPct').textContent = pct + '%';
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('onboardChecklist').innerHTML = checks.map(c => {
    return '<div class="check-item' + (c.done ? ' done' : '') + '"><span class="tick">' + (c.done ? '✓' : '') + '</span>' + esc(c.label) + '</div>';
  }).join('');
}

function renderSellerProducts() {
  const grid = document.getElementById('sellerProductGrid');
  if (!grid) return;
  const products = state.sellerProducts;
  const suspended = state.seller && state.seller.status === 'suspended';
  grid.innerHTML = products.map(p => {
    const low = p.stock > 0 && p.stock <= 3, out = p.stock <= 0;
    return '<div class="pcard"><div class="art-swatch">' + productArtSVG(p.name, p.category, p.art_seed || 0, p.image_url)
      + '<span class="stock-pill ' + (out ? 'out' : low ? 'low' : 'ok') + '">' + (out ? 'Sold out' : low ? ('Only ' + p.stock + ' left') : (p.stock + ' in stock')) + '</span></div>'
      + '<div class="pbody"><h5>' + esc(p.name) + '</h5><p class="price">' + money(p.price) + '</p>'
      + '<div class="actions">'
      + (suspended ? '<button class="mini-btn" disabled>Edit</button>' : '<button class="mini-btn" onclick="openProductForm(\'edit\',\'' + p.id + '\')">Edit</button>')
      + '<button class="mini-btn danger" onclick="deleteProduct(\'' + p.id + '\')">Remove</button></div></div></div>';
  }).join('') + (suspended ? '' : '<button type="button" class="add-product-card" onclick="openProductForm(\'add\')"><div class="plus">+</div><span style="font-weight:600; font-size:.86rem;">Add a product</span></button>');
}

function copyOrderAddress(encodedStr) {
  try {
    const text = decodeURIComponent(encodedStr);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        toastMsg('📋 Customer address copied to clipboard');
      }).catch(() => {
        toastMsg('📋 ' + text);
      });
    } else {
      toastMsg('📋 ' + text);
    }
  } catch (e) {
    toastMsg('📋 Address copied');
  }
}

function orderCardHTML(o, i) {
  const CTA = { pending: 'Acknowledge & Confirm', confirmed: 'Mark as shipped', shipped: 'Mark as delivered', delivered: null };
  const cta = CTA[o.status];
  const payBadge = o.payment_method === 'online' ? '<span class="badge paid">Paid online</span>' : '<span class="badge cod">COD</span>';
  
  const customerName = o.buyer_name || 'Customer';
  const customerPhone = o.buyer_phone || '';
  const customerAddress = o.buyer_address || 'Address provided at checkout';
  const customerPin = o.buyer_pincode || '';
  
  const copyAddressText = encodeURIComponent(customerName + (customerPhone ? ' (Ph: ' + customerPhone + ')' : '') + '\n' + customerAddress + (customerPin ? ' - ' + customerPin : ''));
  const prod = findProduct(o.product_id);
  const prodImg = (prod && prod.image_url) || o.product_image_url || null;

  return '<div class="order-card" style="animation-delay:' + ((i || 0) * 0.06) + 's;">'
    + '<div class="thumb">' + productArtSVG(o.product_name, o.product_category || 'Other', o.product_art_seed || 0, prodImg) + '</div>'
    + '<div class="order-info">'
      + '<div class="top">' + esc(o.product_name) + ' <span class="status-pill ' + o.status + '">' + o.status + '</span> ' + payBadge + '</div>'
      + '<div class="sub">Qty ' + o.qty + ' · ' + money(o.amount) + ' · <span style="opacity:0.8;">Order #' + esc(o.id.slice(-7).toUpperCase()) + '</span></div>'
      + '<div class="order-address-box">'
        + '<div class="addr-row" style="margin-bottom:5px;">'
          + '<span class="addr-tag">Customer</span> <strong>' + esc(customerName) + '</strong>'
          + (customerPhone ? '<span class="addr-phone">· 📞 <a href="tel:' + esc(customerPhone) + '" style="text-decoration:underline;">' + esc(customerPhone) + '</a></span>' : '')
          + '<button type="button" class="copy-addr-btn" onclick="copyOrderAddress(\'' + copyAddressText + '\')" title="Copy customer shipping details">📋 Copy Address</button>'
        + '</div>'
        + '<div class="addr-row">'
          + '<span class="addr-tag">Ship to</span> <span>📍 ' + esc(customerAddress) + (customerPin ? ' — PIN: <strong>' + esc(customerPin) + '</strong>' : '') + '</span>'
        + '</div>'
      + '</div>'
    + '</div>'
    + (cta ? '<button class="order-cta" onclick="advanceOrderStatus(\'' + o.id + '\')">' + cta + '</button>' : '<button class="order-cta" disabled>Completed ✓</button>')
    + '</div>';
}

function renderSellerOrders() {
  const list = state.sellerOrders;
  const container = document.getElementById('sellerOrdersList');
  if (!container) return;
  container.innerHTML = list.length
    ? list.map(orderCardHTML).join('')
    : '<div class="empty-state"><div class="emoji">📦</div><p>No orders yet — once a buyer purchases something, it\'ll show up here!</p></div>';
}

async function advanceOrderStatus(orderId) {
  const NEXT = { pending: 'confirmed', confirmed: 'shipped', shipped: 'delivered' };
  const order = state.sellerOrders.find(o => o.id === orderId);
  if (!order) return;
  const next = NEXT[order.status];
  if (!next) return;

  try {
    await api('/seller/orders/' + orderId + '/status', {
      method: 'PUT',
      body: JSON.stringify({ status: next })
    });
    order.status = next;
    celebrate();
    const msg = next === 'confirmed'
      ? '📦 Order acknowledged & confirmed for packing!'
      : next === 'delivered'
        ? '🎉 Order delivered! Nice work.'
        : 'Order marked as ' + next;
    toastMsg(msg);
    renderSellerOrders();
    renderSellerHome();
  } catch (err) {
    toastMsg(err.message || 'Failed to update order status');
  }
}

function renderSellerProfileForm() {
  if (!state.seller) return;
  document.getElementById('pfShopName').value = state.seller.shop_name || '';
  document.getElementById('pfAbout').value = state.seller.about || '';
  document.getElementById('profileAvatar').textContent = (state.seller.shop_name || 'S')[0].toUpperCase();
  document.getElementById('profileAvatar').style.background = avatarColor(state.seller.email);
}

async function submitProfileForm(e) {
  e.preventDefault();
  const shopName = document.getElementById('pfShopName').value.trim();
  const about = document.getElementById('pfAbout').value.trim();
  if (!shopName) return;

  try {
    const updated = await api('/seller/profile', {
      method: 'PUT',
      body: JSON.stringify({ shopName, about })
    });
    state.seller = { ...state.seller, ...updated };
    const msg = document.getElementById('profileMsg');
    msg.textContent = 'Shop profile saved to database!';
    msg.classList.add('show');
    setTimeout(() => msg.classList.remove('show'), 2500);
    document.getElementById('sellerNameLabel').textContent = shopName;
    celebrate();
    renderSellerHome();
  } catch (err) {
    toastMsg(err.message || 'Failed to update profile');
  }
}

// ---------------- PRODUCT ADD / EDIT MODAL ----------------
let pfState = { mode: 'add', productId: null, artSeed: 0, imageUrl: '' };
function openProductForm(mode, productId) {
  if (state.seller && state.seller.status === 'suspended') {
    toastMsg('Your shop is suspended — contact support to resume selling.');
    return;
  }
  pfState = { mode: mode, productId: productId || null, artSeed: Math.floor(Math.random() * 10000), imageUrl: '' };
  document.getElementById('pfMsg').classList.remove('show');
  document.getElementById('pfTitle').textContent = mode === 'edit' ? 'Edit product' : 'Add a product';
  document.getElementById('pfSubmitBtn').textContent = mode === 'edit' ? 'Save changes' : 'Save product';

  const fileInput = document.getElementById('pfImageFile');
  if (fileInput) fileInput.value = '';
  const urlInput = document.getElementById('pfImageUrlInput');
  if (urlInput) urlInput.value = '';

  if (mode === 'edit') {
    const p = state.sellerProducts.find(item => item.id === productId);
    if (!p) return;
    document.getElementById('pfName').value = p.name;
    document.getElementById('pfCategory').value = p.category;
    document.getElementById('pfStock').value = p.stock;
    document.getElementById('pfPrice').value = p.price;
    document.getElementById('pfOldPrice').value = p.old_price || '';
    document.getElementById('pfDesc').value = p.description || '';
    pfState.artSeed = p.art_seed || 0;
    pfState.imageUrl = p.image_url || '';
    if (urlInput && p.image_url) urlInput.value = p.image_url;
  } else {
    document.getElementById('productForm').reset();
    document.getElementById('pfCategory').value = 'Fashion';
    pfState.imageUrl = '';
  }
  updatePfImageUI();
  renderArtPreview();
  document.getElementById('pfOverlay').classList.add('show');
}

function updatePfImageUI() {
  const emptyState = document.getElementById('pfImageEmptyState');
  const previewState = document.getElementById('pfImagePreviewState');
  const previewImg = document.getElementById('pfPreviewImg');
  const dz = document.getElementById('pfImageDropzone');

  if (pfState.imageUrl) {
    if (emptyState) emptyState.style.display = 'none';
    if (previewState) previewState.style.display = 'block';
    if (previewImg) previewImg.src = pfState.imageUrl;
    if (dz) dz.style.borderColor = 'var(--primary)';
  } else {
    if (emptyState) emptyState.style.display = 'block';
    if (previewState) previewState.style.display = 'none';
    if (previewImg) previewImg.src = '';
    if (dz) dz.style.borderColor = 'var(--border)';
  }
}

function handleProductImageFile(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const reader = new FileReader();
  const dz = document.getElementById('pfImageDropzone');
  if (dz) dz.style.opacity = '0.5';

  reader.onload = async function(e) {
    const base64 = e.target.result;
    try {
      const res = await api('/seller/upload-image', {
        method: 'POST',
        body: JSON.stringify({ imageBase64: base64, filename: file.name })
      });
      pfState.imageUrl = res.url || base64;
    } catch (err) {
      pfState.imageUrl = base64;
    }
    const urlInput = document.getElementById('pfImageUrlInput');
    if (urlInput) urlInput.value = pfState.imageUrl;
    if (dz) dz.style.opacity = '1';
    updatePfImageUI();
    renderArtPreview();
  };
  reader.readAsDataURL(file);
}

async function handleProductImageUrlInput(url) {
  const trimmed = (url || '').trim();
  pfState.imageUrl = trimmed;
  updatePfImageUI();
  renderArtPreview();

  if (trimmed && (trimmed.includes('pin.it') || trimmed.includes('pinterest.com/pin/'))) {
    toastMsg('🔍 Fetching high-res photo from Pinterest…');
    try {
      const res = await api('/seller/resolve-image-url', {
        method: 'POST',
        body: JSON.stringify({ url: trimmed })
      });
      if (res && res.imageUrl) {
        pfState.imageUrl = res.imageUrl;
        const urlInput = document.getElementById('pfImageUrlInput');
        if (urlInput) urlInput.value = res.imageUrl;
        updatePfImageUI();
        renderArtPreview();
        toastMsg('📸 Pinterest photo loaded!');
      }
    } catch (err) {
      console.warn('Could not resolve Pinterest URL:', err);
    }
  }
}

function selectSampleProductImage(url) {
  pfState.imageUrl = url;
  const urlInput = document.getElementById('pfImageUrlInput');
  if (urlInput) urlInput.value = url;
  updatePfImageUI();
  renderArtPreview();
  toastMsg('Selected product photo: ' + url.split('/').pop());
}

function removeProductImage() {
  pfState.imageUrl = '';
  const fileInput = document.getElementById('pfImageFile');
  if (fileInput) fileInput.value = '';
  const urlInput = document.getElementById('pfImageUrlInput');
  if (urlInput) urlInput.value = '';
  updatePfImageUI();
  renderArtPreview();
}

function closeProductForm() {
  document.getElementById('pfOverlay')?.classList.remove('show');
}

function renderArtPreview() {
  const name = document.getElementById('pfName')?.value || 'New product';
  const cat = document.getElementById('pfCategory')?.value || 'Other';
  const preview = document.getElementById('pfArtPreview');
  if (preview) {
    preview.innerHTML = productArtSVG(name, cat, pfState.artSeed, pfState.imageUrl);
  }
}

function shuffleArtSeed() {
  pfState.artSeed = Math.floor(Math.random() * 10000);
  renderArtPreview();
}

async function submitProductForm(e) {
  e.preventDefault();
  const name = document.getElementById('pfName').value.trim();
  const category = document.getElementById('pfCategory').value;
  const stock = parseInt(document.getElementById('pfStock').value, 10);
  const price = parseInt(document.getElementById('pfPrice').value, 10);
  const oldPriceRaw = document.getElementById('pfOldPrice').value;
  const oldPrice = oldPriceRaw ? parseInt(oldPriceRaw, 10) : null;
  const description = document.getElementById('pfDesc').value.trim();
  const imageUrl = (pfState.imageUrl || document.getElementById('pfImageUrlInput')?.value || '').trim();
  const msgEl = document.getElementById('pfMsg');

  // Enforce product picture requirement
  if (!imageUrl) {
    msgEl.textContent = '📸 Please add a product picture before saving!';
    msgEl.classList.add('show');
    const dz = document.getElementById('pfImageDropzone');
    if (dz) {
      dz.scrollIntoView({ behavior: 'smooth', block: 'center' });
      dz.classList.add('pf-highlight-error');
      setTimeout(() => dz.classList.remove('pf-highlight-error'), 2500);
    }
    return;
  }

  if (!name || isNaN(price) || price <= 0 || isNaN(stock) || stock < 0) {
    msgEl.textContent = 'Please fill in a valid name, price and stock.';
    msgEl.classList.add('show');
    return;
  }
  if (oldPrice && oldPrice <= price) {
    msgEl.textContent = 'Original price should be higher than current price.';
    msgEl.classList.add('show');
    return;
  }

  msgEl.classList.remove('show');
  const btn = document.getElementById('pfSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    const data = { name, category, stock, price, oldPrice, description, artSeed: pfState.artSeed, imageUrl };
    if (pfState.mode === 'edit') {
      await api('/seller/products/' + pfState.productId, { method: 'PUT', body: JSON.stringify(data) });
      toastMsg('Product updated in MySQL');
    } else {
      await api('/seller/products', { method: 'POST', body: JSON.stringify(data) });
      toastMsg('Product added with photo 🎉');
      celebrate();
    }
    closeProductForm();
    await loadSellerProducts();
    await loadProducts();
    renderSellerHome();
  } catch (err) {
    msgEl.textContent = err.message || "Couldn't save product";
    msgEl.classList.add('show');
  }

  btn.disabled = false;
  btn.textContent = pfState.mode === 'edit' ? 'Save changes' : 'Save product';
}

async function deleteProduct(id) {
  const p = state.sellerProducts.find(item => item.id === id);
  const ok = await askConfirm('Remove this product?', p ? ('"' + p.name + '" will be removed from Bazaaro.') : "This can't be undone.");
  if (!ok) return;

  try {
    await api('/seller/products/' + id, { method: 'DELETE' });
    toastMsg('Product removed');
    await loadSellerProducts();
    await loadProducts();
    renderSellerHome();
  } catch (err) {
    toastMsg(err.message || 'Failed to remove product');
  }
}

// ---------------- SELLER AUTH ----------------
function switchAuthTab(mode) {
  document.getElementById('tabLogin').classList.toggle('active', mode === 'login');
  document.getElementById('tabSignup').classList.toggle('active', mode === 'signup');
  document.getElementById('loginForm').classList.toggle('active', mode === 'login');
  document.getElementById('signupForm').classList.toggle('active', mode === 'signup');
  document.getElementById('authTitle').textContent = mode === 'login' ? 'Welcome back' : 'Start your shop';
  document.getElementById('authSub').textContent = mode === 'login' ? 'Log in to manage your shop.' : 'Create a free seller account in under a minute.';
  document.getElementById('authMsg').classList.remove('show');
}

function fillDemoCreds() {
  switchAuthTab('login');
  document.getElementById('loginEmail').value = 'demo@bazaaro.test';
  document.getElementById('loginPassword').value = 'demo1234';
  toastMsg('Demo details filled in — hit Log in');
}

async function submitSignup(e) {
  e.preventDefault();
  const shopName = document.getElementById('signupShop').value.trim();
  const email = document.getElementById('signupEmail').value.trim().toLowerCase();
  const password = document.getElementById('signupPassword').value;
  const msgEl = document.getElementById('authMsg');
  msgEl.classList.remove('show');

  const btn = document.getElementById('signupSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Creating shop…';

  try {
    const res = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ shopName, email, password, role: 'SELLER' })
    });
    state.token = res.token;
    localStorage.setItem('bzr_token', res.token);
    state.seller = res.user;
    renderHeader();
    celebrate();
    toastMsg('Welcome to Bazaaro, ' + shopName + '! 🎉');
    showScreen('seller-dashboard');
  } catch (err) {
    msgEl.textContent = err.message || 'Failed to create shop';
    msgEl.classList.add('show');
  }
  btn.disabled = false;
  btn.textContent = 'Create my shop';
}

async function submitLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;
  const msgEl = document.getElementById('authMsg');
  msgEl.classList.remove('show');

  const btn = document.getElementById('loginSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Logging in…';

  try {
    const res = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, requestedRole: 'SELLER' })
    });
    state.token = res.token;
    localStorage.setItem('bzr_token', res.token);
    state.seller = res.user;
    renderHeader();
    toastMsg('Welcome back, ' + (res.user.shopName || 'seller') + '!');
    showScreen('seller-dashboard');
  } catch (err) {
    msgEl.textContent = err.message || 'Login failed';
    msgEl.classList.add('show');
  }
  btn.disabled = false;
  btn.textContent = 'Log in';
}

function logoutSeller() {
  state.seller = null;
  state.token = null;
  localStorage.removeItem('bzr_token');
  renderHeader();
  showScreen('store');
  toastMsg('Logged out of seller account');
}

// ---------------- ADMIN AUTH & DASHBOARD ----------------
function fillAdminDemoCreds() {
  document.getElementById('adminEmail').value = 'admin@bazaaro.test';
  document.getElementById('adminPassword').value = 'admin1234';
  toastMsg('Demo admin details filled in — hit Log in');
}

async function submitAdminLogin(e) {
  e.preventDefault();
  const email = document.getElementById('adminEmail').value.trim().toLowerCase();
  const password = document.getElementById('adminPassword').value;
  const msgEl = document.getElementById('adminAuthMsg');
  msgEl.classList.remove('show');

  const btn = document.getElementById('adminLoginBtn');
  btn.disabled = true;
  btn.textContent = 'Logging in…';

  try {
    const res = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, requestedRole: 'ADMIN' })
    });
    state.token = res.token;
    localStorage.setItem('bzr_token', res.token);
    state.admin = res.user;
    toastMsg('Welcome back, Admin!');
    showScreen('admin-dashboard');
  } catch (err) {
    msgEl.textContent = err.message || 'Invalid admin credentials';
    msgEl.classList.add('show');
  }
  btn.disabled = false;
  btn.textContent = 'Log in';
}

function logoutAdmin() {
  state.admin = null;
  state.token = null;
  localStorage.removeItem('bzr_token');
  showScreen('store');
  toastMsg('Logged out of admin account');
}

function toggleAdminSidebar(show) {
  document.getElementById('adminSidebar')?.classList.toggle('show', show);
  document.getElementById('adminSidebarScrim')?.classList.toggle('show', show);
}
const ADMIN_PAGE_TEXT = {
  overview: ['Platform overview', 'How Bazaaro is doing, at a glance'],
  sellers: ['Sellers', 'Every seller on the platform'],
  products: ['Products', 'Every product listed on Bazaaro'],
  orders: ['Orders', 'Every order placed across all sellers'],
};
function showAdminPage(name) {
  state.adminPage = name;
  document.querySelectorAll('#screen-admin-dashboard .dash-page').forEach(p => p.classList.remove('active'));
  document.getElementById('apage-' + name)?.classList.add('active');
  document.querySelectorAll('#screen-admin-dashboard .nav-link').forEach(l => l.classList.toggle('active', l.dataset.apage === name));
  document.getElementById('adminPageTitle').textContent = ADMIN_PAGE_TEXT[name][0];
  document.getElementById('adminPageSub').textContent = ADMIN_PAGE_TEXT[name][1];
  toggleAdminSidebar(false);
}

async function renderAdminDashboard() {
  if (!state.admin) {
    showScreen('admin-auth');
    return;
  }
  try {
    const [stats, sellers, products, orders] = await Promise.all([
      api('/admin/stats'),
      api('/admin/sellers'),
      api('/admin/products'),
      api('/admin/orders')
    ]);

    document.getElementById('adminStatRow').innerHTML = [
      { icon: '🏪', bg: 'var(--sky-bg)', color: 'var(--sky)', value: stats.sellersCount, label: 'Total sellers', note: stats.activeSellersCount + ' active' },
      { icon: '🛍️', bg: 'var(--lav-bg)', color: 'var(--lav)', value: stats.productsCount, label: 'Products listed', note: 'Across all shops' },
      { icon: '📦', bg: '#FDF0DC', color: 'var(--accent-dark)', value: stats.ordersCount, label: 'Total orders', note: 'All sellers combined' },
      { icon: '💰', bg: 'var(--sage-bg)', color: 'var(--sage)', value: money(stats.gmv), label: 'Gross order value', note: 'Lifetime from MySQL' }
    ].map((c, i) => {
      return '<div class="stat-card" style="animation-delay:' + (i * 0.05) + 's"><div class="stat-icon" style="background:' + c.bg + ';color:' + c.color + ';">' + c.icon + '</div>'
        + '<p class="stat-value">' + c.value + '</p><p class="stat-label">' + c.label + '</p><p class="stat-note" style="color:' + c.color + ';">' + c.note + '</p></div>';
    }).join('');

    document.getElementById('adminStatusBreakdown').innerHTML = Object.keys(stats.statusCounts).map(st => {
      return '<div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--border);">'
        + '<span class="status-pill ' + st + '">' + st + '</span><strong>' + stats.statusCounts[st] + '</strong></div>';
    }).join('');

    document.getElementById('adminSellersTable').innerHTML =
      '<tr><th>Shop</th><th>Email</th><th>Products</th><th>Status</th><th></th></tr>' +
      sellers.map(s => {
        const suspended = s.status === 'suspended';
        return '<tr><td><div class="avatar" style="width:30px;height:30px;font-size:.7rem;display:inline-flex;vertical-align:middle;margin-right:8px;background:' + avatarColor(s.email) + ';">' + ((s.shop_name || 'S')[0].toUpperCase()) + '</div>' + esc(s.shop_name || '—') + '</td>'
          + '<td>' + esc(s.email) + '</td><td>' + (s.productCount || 0) + '</td>'
          + '<td><span class="badge ' + (suspended ? 'suspended' : 'active') + '">' + (suspended ? 'Suspended' : 'Active') + '</span></td>'
          + '<td><button class="mini-btn' + (suspended ? '' : ' danger') + '" onclick="toggleSellerStatus(\'' + s.id + '\')">' + (suspended ? 'Activate' : 'Suspend') + '</button></td></tr>';
      }).join('');

    document.getElementById('adminProductsTable').innerHTML =
      '<tr><th>Product</th><th>Seller</th><th>Category</th><th>Price</th><th>Stock</th><th></th></tr>' +
      products.map(p => {
        return '<tr><td>' + esc(p.name) + '</td><td>' + esc(p.seller_name) + '</td><td>' + esc(p.category) + '</td><td>' + money(p.price) + '</td><td>' + p.stock + '</td>'
          + '<td><button class="mini-btn danger" onclick="adminRemoveProduct(\'' + p.id + '\')">Remove</button></td></tr>';
      }).join('');

    document.getElementById('adminOrdersTable').innerHTML =
      '<tr><th>Product</th><th>Buyer</th><th>Seller</th><th>Amount</th><th>Payment</th><th>Status</th></tr>' +
      orders.map(o => {
        const payBadge = o.payment_method === 'online' ? '<span class="badge paid">Paid online</span>' : '<span class="badge cod">COD</span>';
        return '<tr><td>' + esc(o.product_name) + '</td><td>' + esc(o.buyer_name) + '</td><td>' + esc(o.seller_email) + '</td><td>' + money(o.amount) + '</td>'
          + '<td>' + payBadge + '</td><td><span class="status-pill ' + o.status + '">' + o.status + '</span></td></tr>';
      }).join('');

    showAdminPage(state.adminPage || 'overview');
  } catch (err) {
    console.error('Failed to load admin dashboard:', err);
  }
}

async function toggleSellerStatus(sellerId) {
  const ok = await askConfirm('Update seller status?', 'Suspending hides their products immediately; activating restores them.');
  if (!ok) return;
  try {
    const sellers = await api('/admin/sellers');
    const s = sellers.find(item => String(item.id) === String(sellerId));
    const nextStatus = s && s.status === 'suspended' ? 'active' : 'suspended';
    await api('/admin/sellers/' + sellerId + '/status', {
      method: 'PUT',
      body: JSON.stringify({ status: nextStatus })
    });
    toastMsg('Seller status updated in MySQL');
    await loadProducts();
    renderAdminDashboard();
  } catch (err) {
    toastMsg(err.message || 'Failed to update status');
  }
}

async function adminRemoveProduct(productId) {
  const ok = await askConfirm('Remove this product?', "This will be deleted from MySQL and removed from the storefront.");
  if (!ok) return;
  try {
    await api('/admin/products/' + productId, { method: 'DELETE' });
    toastMsg('Product removed by admin');
    await loadProducts();
    renderAdminDashboard();
  } catch (err) {
    toastMsg(err.message || 'Failed to remove product');
  }
}

// ---------------- TESTIMONIALS ----------------
const TESTIMONIALS = [
  { text: "I found a tiny pottery seller here — the planter looks nothing like mass-market stuff. Genuinely special.", name: 'Divya R.', role: 'Buyer' },
  { text: "As a seller, Bazaaro got my handmade jewelry in front of people who actually care about craft.", name: 'Arjun Mehta', role: 'Seller' },
  { text: "Cash on delivery and easy returns made me trust a brand-new small seller straight away.", name: 'Kavya S.', role: 'Buyer' },
];
function renderTestimonials() {
  const slides = document.getElementById('testiSlides');
  const dots = document.getElementById('testiDots');
  if (!slides || !dots) return;
  slides.innerHTML = TESTIMONIALS.map((t, i) => {
    return '<div class="testi-slide' + (i === 0 ? ' active' : '') + '"><p>"' + esc(t.text) + '"</p><div class="who">'
      + '<div class="testi-avatar" style="background:' + avatarColor(t.name) + ';">' + esc(t.name[0]) + '</div>'
      + '<div style="text-align:left;"><div class="name">' + esc(t.name) + '</div><div class="role">' + esc(t.role) + '</div></div></div></div>';
  }).join('');
  dots.innerHTML = TESTIMONIALS.map((_, i) => '<button class="' + (i === 0 ? 'active' : '') + '" onclick="showTesti(' + i + ')"></button>').join('');
}
let testiIdx = 0, testiTimer = null;
function showTesti(i) {
  document.querySelectorAll('.testi-slide').forEach((s, idx) => s.classList.toggle('active', idx === i));
  document.querySelectorAll('.testi-dots button').forEach((d, idx) => d.classList.toggle('active', idx === i));
  testiIdx = i;
}
function startTestiAuto() {
  clearInterval(testiTimer);
  testiTimer = setInterval(() => showTesti((testiIdx + 1) % TESTIMONIALS.length), 4800);
}

// ---------------- INITIAL BOOTSTRAP ----------------
async function initSession() {
  if (!state.token) return;
  try {
    const user = await api('/auth/me');
    if (user.role === 'BUYER') state.buyer = user;
    else if (user.role === 'SELLER') state.seller = user;
    else if (user.role === 'ADMIN') state.admin = user;
  } catch (err) {
    localStorage.removeItem('bzr_token');
    state.token = null;
  }
}

async function bootstrap() {
  await initSession();
  await loadProducts();
  await loadCart();
  await loadWishlist();

  renderHeader();
  renderCategoryStrip();
  renderTestimonials();
  startTestiAuto();
  showScreen('store');

  const boot = document.getElementById('boot');
  if (boot) {
    boot.classList.add('gone');
    setTimeout(() => boot.remove(), 550);
  }

  // Scroll animations
  window.addEventListener('scroll', () => {
    const h = document.getElementById('header');
    if (h) h.classList.toggle('shrink', window.scrollY > 30);
  });
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) en.target.classList.add('in'); });
  }, { threshold: .15 });
  document.querySelectorAll('.reveal, .stitch').forEach(el => io.observe(el));
}

// Global exposure for inline HTML events
window.showScreen = showScreen;
window.goSell = goSell;
window.handleUserBtnClick = handleUserBtnClick;
window.clearFilterAndScroll = clearFilterAndScroll;
window.setCategoryFilter = setCategoryFilter;
window.onSearchInput = onSearchInput;
window.scrollToRail = scrollToRail;
window.scrollRail = scrollRail;
window.toastMsg = toastMsg;
window.toggleWish = toggleWish;
window.quickAdd = quickAdd;
window.openDrawer = openDrawer;
window.closeDrawer = closeDrawer;
window.changeCartQty = changeCartQty;
window.removeFromCart = removeFromCart;
window.goToCheckout = goToCheckout;
window.selectPayMethod = selectPayMethod;
window.selectOnlineTab = selectOnlineTab;
window.submitCheckout = submitCheckout;
window.openProductModal = openProductModal;
window.closeProductModal = closeProductModal;
window.changePvQty = changePvQty;
window.pvAddToCart = pvAddToCart;
window.pvBuyNow = pvBuyNow;
window.openProductForm = openProductForm;
window.closeProductForm = closeProductForm;
window.shuffleArtSeed = shuffleArtSeed;
window.renderArtPreview = renderArtPreview;
window.handleProductImageFile = handleProductImageFile;
window.handleProductImageUrlInput = handleProductImageUrlInput;
window.selectSampleProductImage = selectSampleProductImage;
window.removeProductImage = removeProductImage;
window.submitProductForm = submitProductForm;
window.deleteProduct = deleteProduct;
window.switchAuthTab = switchAuthTab;
window.fillDemoCreds = fillDemoCreds;
window.submitSignup = submitSignup;
window.submitLogin = submitLogin;
window.logoutSeller = logoutSeller;
window.toggleSidebar = toggleSidebar;
window.showSellerPage = showSellerPage;
window.advanceOrderStatus = advanceOrderStatus;
window.copyOrderAddress = copyOrderAddress;
window.submitProfileForm = submitProfileForm;
window.fillAdminDemoCreds = fillAdminDemoCreds;
window.submitAdminLogin = submitAdminLogin;
window.logoutAdmin = logoutAdmin;
window.toggleAdminSidebar = toggleAdminSidebar;
window.showAdminPage = showAdminPage;
window.toggleSellerStatus = toggleSellerStatus;
window.adminRemoveProduct = adminRemoveProduct;
window.showTesti = showTesti;
window.askConfirm = askConfirm;
window.confirmResolve = confirmResolve;
window.switchBuyerAuthTab = switchBuyerAuthTab;
window.fillBuyerDemoCreds = fillBuyerDemoCreds;
window.submitBuyerLogin = submitBuyerLogin;
window.submitBuyerSignup = submitBuyerSignup;
window.logoutBuyer = logoutBuyer;
window.showBuyerProfileTab = showBuyerProfileTab;
window.submitBuyerProfileUpdate = submitBuyerProfileUpdate;
window.submitNewAddress = submitNewAddress;
window.setDefaultAddress = setDefaultAddress;
window.deleteAddress = deleteAddress;
window.openReviewModal = openReviewModal;
window.closeReviewModal = closeReviewModal;
window.submitReviewForm = submitReviewForm;

document.addEventListener('DOMContentLoaded', bootstrap);
