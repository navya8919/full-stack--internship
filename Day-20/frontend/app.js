// ==========================================================================
// CONFIGURATION & STATE
// ==========================================================================
const API_BASE_URL = 'http://localhost:5000/api';

// Create Axios Instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// App State
const state = {
  token: localStorage.getItem('token') || null,
  user: null,
  cart: { items: [], totalPrice: 0 },
  products: [],
  orders: [],
  filters: {
    search: '',
    category: 'All',
    minPrice: '',
    maxPrice: '',
    sort: 'newest',
    page: 1,
    limit: 12
  },
  admin: {
    products: [],
    orders: [],
    activeTab: 'products' // 'products' or 'orders'
  }
};

// Set token header if exists
if (state.token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
}

// ==========================================================================
// UI HELPER FUNCTIONS
// ==========================================================================

// Show Toast Notification
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.innerText = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => {
    toast.className = 'toast hidden';
  }, 3000);
}

// Format Currency
function formatPrice(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

// Generate Rating Stars
function renderStars(rating) {
  const fullStars = Math.round(rating);
  let starsHtml = '';
  for (let i = 1; i <= 5; i++) {
    if (i <= fullStars) {
      starsHtml += '★';
    } else {
      starsHtml += '☆';
    }
  }
  return starsHtml;
}

// Switch Page View
function navigateTo(pageId) {
  const pages = document.querySelectorAll('.page');
  pages.forEach(page => page.classList.remove('active'));
  
  const targetPage = document.getElementById(`${pageId}Page`);
  if (targetPage) {
    targetPage.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Handle page-specific loading
  if (pageId === 'home') {
    fetchFeaturedProducts();
  } else if (pageId === 'shop') {
    fetchProducts();
  } else if (pageId === 'cart') {
    loadCartPage();
  } else if (pageId === 'orders') {
    fetchUserOrders();
  } else if (pageId === 'admin') {
    loadAdminDashboard();
  }
}

// ==========================================================================
// AUTHENTICATION MANAGEMENT
// ==========================================================================

// Update UI based on auth state
function updateAuthUI() {
  const navUser = document.getElementById('navUser');
  const navProfile = document.getElementById('navProfile');
  const avatarCircle = document.getElementById('avatarCircle');
  const profileName = document.getElementById('profileName');
  const adminDashboardLink = document.getElementById('adminDashboardLink');

  if (state.token && state.user) {
    navUser.classList.add('hidden');
    navProfile.classList.remove('hidden');
    avatarCircle.innerText = state.user.name.charAt(0).toUpperCase();
    profileName.innerText = state.user.name.split(' ')[0];
    
    // Show Admin Link if role is admin
    if (state.user.role === 'admin') {
      adminDashboardLink.classList.remove('hidden');
    } else {
      adminDashboardLink.classList.add('hidden');
    }
  } else {
    navUser.classList.remove('hidden');
    navProfile.classList.add('hidden');
    adminDashboardLink.classList.add('hidden');
  }
}

// Load Current Logged-in User
async function loadCurrentUser() {
  if (!state.token) return;
  try {
    const res = await api.get('/auth/me');
    state.user = res.data;
    updateAuthUI();
    fetchCart();
  } catch (error) {
    console.error('Session restore failed:', error);
    logout();
  }
}

// Signup Handler
async function handleSignup(e) {
  e.preventDefault();
  const name = document.getElementById('signupName').value;
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  const errorEl = document.getElementById('signupError');

  try {
    errorEl.classList.add('hidden');
    const res = await api.post('/auth/signup', { name, email, password });
    
    // Save token
    state.token = res.data.token;
    state.user = res.data.user;
    localStorage.setItem('token', state.token);
    api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
    
    showToast('Account created successfully! 🎉');
    closeModal('authModal');
    updateAuthUI();
    fetchCart();
    navigateTo('home');
  } catch (error) {
    errorEl.innerText = error.response?.data?.message || 'Registration failed';
    errorEl.classList.remove('hidden');
  }
}

// Login Handler
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');

  try {
    errorEl.classList.add('hidden');
    const res = await api.post('/auth/login', { email, password });
    
    // Save token
    state.token = res.data.token;
    state.user = res.data.user;
    localStorage.setItem('token', state.token);
    api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
    
    showToast('Welcome back! 👋');
    closeModal('authModal');
    updateAuthUI();
    fetchCart();
    navigateTo('home');
  } catch (error) {
    errorEl.innerText = error.response?.data?.message || 'Invalid email or password';
    errorEl.classList.remove('hidden');
  }
}

// Logout Handler
function logout() {
  state.token = null;
  state.user = null;
  state.cart = { items: [], totalPrice: 0 };
  localStorage.removeItem('token');
  delete api.defaults.headers.common['Authorization'];
  
  // Update Badge
  document.getElementById('cartBadge').innerText = '0';
  
  updateAuthUI();
  showToast('Logged out successfully.');
  navigateTo('home');
}

// ==========================================================================
// PRODUCTS CATALOG & SHOPPAGE
// ==========================================================================

// Render skeleton cards in a target container
function renderSkeletons(containerId, count = 4) {
  const grid = document.getElementById(containerId);
  grid.innerHTML = Array(count).fill('<div class="skeleton-card"></div>').join('');
}

// Fetch Featured Products for Home
async function fetchFeaturedProducts() {
  renderSkeletons('featuredGrid', 4);
  try {
    const res = await api.get('/products/featured');
    const products = res.data;
    
    const grid = document.getElementById('featuredGrid');
    if (products.length === 0) {
      grid.innerHTML = '<p class="no-reviews">No featured products available.</p>';
      return;
    }
    
    grid.innerHTML = products.map(product => renderProductCard(product)).join('');
  } catch (error) {
    console.error('Error fetching featured products:', error);
    document.getElementById('featuredGrid').innerHTML = '<p class="form-error">Failed to load featured products.</p>';
  }
}

// Fetch and render products with filters
async function fetchProducts() {
  renderSkeletons('productsGrid', 6);
  document.getElementById('productCount').innerText = 'Loading...';
  
  try {
    const params = {
      page: state.filters.page,
      limit: state.filters.limit,
      sort: state.filters.sort
    };
    
    if (state.filters.search) params.search = state.filters.search;
    if (state.filters.category && state.filters.category !== 'All') params.category = state.filters.category;
    if (state.filters.minPrice) params.minPrice = state.filters.minPrice;
    if (state.filters.maxPrice) params.maxPrice = state.filters.maxPrice;
    
    const res = await api.get('/products', { params });
    const { products, total, pages, page } = res.data;
    state.products = products;
    
    // Render
    const grid = document.getElementById('productsGrid');
    if (products.length === 0) {
      grid.innerHTML = '<div class="cart-empty"><div class="cart-empty-icon">🔍</div><p>No products match your filters.</p></div>';
      document.getElementById('productCount').innerText = '0 products';
      document.getElementById('pagination').innerHTML = '';
      return;
    }
    
    grid.innerHTML = products.map(product => renderProductCard(product)).join('');
    document.getElementById('productCount').innerText = `${total} products found`;
    
    // Render pagination
    renderPagination(page, pages);
  } catch (error) {
    console.error('Error fetching products:', error);
    document.getElementById('productsGrid').innerHTML = '<p class="form-error">Failed to load products.</p>';
  }
}

// Generate Product Card HTML
function renderProductCard(product) {
  const image = product.images[0] || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=500';
  const originalPriceHtml = product.originalPrice && product.originalPrice > product.price 
    ? `<span class="price-old">${formatPrice(product.originalPrice)}</span>` 
    : '';

  // Discount Badge
  let discountBadge = '';
  if (product.originalPrice && product.originalPrice > product.price) {
    const pct = Math.round((1 - product.price / product.originalPrice) * 100);
    discountBadge = `<span class="discount-badge">-${pct}%</span>`;
  }

  // Featured Badge
  const featuredBadge = product.featured ? `<span class="featured-badge">⭐ Featured</span>` : '';

  return `
    <div class="product-card">
      <div class="product-img-wrapper" onclick="openProductDetail('${product._id}')" style="cursor:pointer">
        <img src="${image}" alt="${product.name}" loading="lazy"/>
        ${discountBadge}
        ${featuredBadge}
      </div>
      <div class="product-info">
        <span class="product-brand">${product.brand}</span>
        <h3 class="product-title" onclick="openProductDetail('${product._id}')" style="cursor:pointer">${product.name}</h3>
        <div class="product-rating">
          ${renderStars(product.rating)}
          <span>(${product.numReviews})</span>
        </div>
        <div class="product-footer">
          <div class="product-price">
            <span class="price-now">${formatPrice(product.price)}</span>
            ${originalPriceHtml}
          </div>
          <button class="product-btn" onclick="handleAddToCartClick(event, '${product._id}')" title="Add to Cart">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

// Render Pagination Controls
function renderPagination(currentPage, totalPages) {
  const container = document.getElementById('pagination');
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }
  
  let html = '';
  
  // Previous button
  html += `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">←</button>`;
  
  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="page-btn ${currentPage === i ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
  }
  
  // Next button
  html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">→</button>`;
  
  container.innerHTML = html;
}

function changePage(page) {
  state.filters.page = page;
  fetchProducts();
}

// ==========================================================================
// PRODUCT DETAILS & REVIEWS
// ==========================================================================
async function openProductDetail(productId) {
  try {
    const res = await api.get(`/products/${productId}`);
    const product = res.data;
    state.currentProduct = product;
    
    const image = product.images[0] || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=500';
    const isOutOfStock = product.stock <= 0;
    const stockStatusText = isOutOfStock ? '❌ Out of Stock' : `🟢 In Stock (${product.stock} left)`;
    const stockClass = isOutOfStock ? 'stock-out' : 'stock-in';

    const originalPriceHtml = product.originalPrice && product.originalPrice > product.price 
      ? `<span class="price-old" style="font-size:1.3rem; margin-left:10px">${formatPrice(product.originalPrice)}</span>` 
      : '';

    // Reviews list render
    let reviewsHtml = '<p class="no-reviews">No reviews yet. Be the first to write one!</p>';
    if (product.reviews && product.reviews.length > 0) {
      reviewsHtml = product.reviews.map(r => `
        <div class="review-item">
          <div class="review-meta">
            <span class="review-author">${r.name}</span>
            <span class="review-rating">${renderStars(r.rating)}</span>
          </div>
          <p class="review-comment">${r.comment}</p>
        </div>
      `).join('');
    }

    // Review Form for logged in users
    const reviewFormHtml = state.token 
      ? `
        <form id="reviewForm" class="review-form" onsubmit="handleReviewSubmit(event, '${product._id}')">
          <span class="review-form-title">Write a Customer Review</span>
          <div class="form-group">
            <label>Rating</label>
            <div class="rating-select">
              <input type="radio" name="reviewRating" id="r5" value="5" required/><label for="r5">★</label>
              <input type="radio" name="reviewRating" id="r4" value="4"/><label for="r4">★</label>
              <input type="radio" name="reviewRating" id="r3" value="3"/><label for="r3">★</label>
              <input type="radio" name="reviewRating" id="r2" value="2"/><label for="r2">★</label>
              <input type="radio" name="reviewRating" id="r1" value="1"/><label for="r1">★</label>
            </div>
          </div>
          <div class="form-group">
            <label for="reviewComment">Review Description</label>
            <textarea id="reviewComment" rows="2" placeholder="What did you think of the product?" required></textarea>
          </div>
          <button type="submit" class="btn-primary btn-sm">Submit Review</button>
        </form>
      ` 
      : '<p class="no-reviews"><a href="#" onclick="openModal(\'authModal\'); return false;" style="color:var(--primary); font-weight:600">Login</a> to write a product review.</p>';

    const modalContent = document.getElementById('productModalContent');
    modalContent.innerHTML = `
      <div class="product-detail-layout">
        <div class="product-detail-img">
          <img src="${image}" alt="${product.name}"/>
        </div>
        <div class="product-detail-info">
          <span class="detail-brand">${product.brand}</span>
          <h2>${product.name}</h2>
          <div class="product-rating" style="font-size:1rem">
            ${renderStars(product.rating)}
            <span>(${product.numReviews} customer reviews)</span>
          </div>
          <div class="detail-price-row">
            <span class="detail-price">${formatPrice(product.price)}</span>
            ${originalPriceHtml}
          </div>
          <div class="detail-stock ${stockClass}">${stockStatusText}</div>
          <p class="detail-desc">${product.description}</p>
          
          <button class="btn-primary" style="margin-top:10px" 
            ${isOutOfStock ? 'disabled' : ''} 
            onclick="handleAddToCartClick(event, '${product._id}'); closeModal('productModal')">
            🛒 Add to Cart
          </button>
          
          <div class="reviews-section">
            <h3>Customer Reviews</h3>
            <div class="reviews-list">${reviewsHtml}</div>
            ${reviewFormHtml}
          </div>
        </div>
      </div>
    `;
    
    openModal('productModal');
  } catch (error) {
    console.error('Error fetching product details:', error);
    showToast('Failed to load product details.', 'error');
  }
}

// Review Submit
async function handleReviewSubmit(e, productId) {
  e.preventDefault();
  
  // Find selected rating
  const ratingEl = document.querySelector('input[name="reviewRating"]:checked');
  const comment = document.getElementById('reviewComment').value;
  
  if (!ratingEl) {
    showToast('Please select a star rating.', 'error');
    return;
  }
  
  const rating = Number(ratingEl.value);

  try {
    await api.post(`/products/${productId}/review`, { rating, comment });
    showToast('Review added successfully! ⭐');
    // Refresh modal
    openProductDetail(productId);
  } catch (error) {
    showToast(error.response?.data?.message || 'Failed to submit review', 'error');
  }
}

// ==========================================================================
// CART OPERATIONS
// ==========================================================================

// Load active cart
async function fetchCart() {
  if (!state.token) return;
  try {
    const res = await api.get('/cart');
    state.cart = res.data;
    
    // Update Badge
    const totalItems = state.cart.items.reduce((acc, item) => acc + item.quantity, 0);
    document.getElementById('cartBadge').innerText = totalItems;
  } catch (error) {
    console.error('Error fetching cart:', error);
  }
}

// Add Item click
async function handleAddToCartClick(e, productId) {
  e.stopPropagation();
  if (!state.token) {
    showToast('Please log in to add items to your cart.', 'warning');
    openModal('authModal');
    return;
  }
  
  try {
    const res = await api.post('/cart/add', { productId, quantity: 1 });
    state.cart = res.data.cart;
    
    // Update Badge
    const totalItems = state.cart.items.reduce((acc, item) => acc + item.quantity, 0);
    document.getElementById('cartBadge').innerText = totalItems;
    
    showToast('Item added to cart! 🛍️');
  } catch (error) {
    showToast(error.response?.data?.message || 'Failed to add item', 'error');
  }
}

// Populate and load Cart Page
async function loadCartPage() {
  if (!state.token) {
    showToast('Please login to view your cart.', 'warning');
    openModal('authModal');
    navigateTo('home');
    return;
  }

  // Refresh cart from server
  await fetchCart();

  const container = document.getElementById('cartItems');
  const subtotalEl = document.getElementById('summarySubtotal');
  const shippingEl = document.getElementById('summaryShipping');
  const taxEl = document.getElementById('summaryTax');
  const totalEl = document.getElementById('summaryTotal');

  if (state.cart.items.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">🛒</div>
        <h3>Your cart is empty</h3>
        <p style="color:var(--text-muted); margin: 8px 0 24px">Find some amazing deals in our shop!</p>
        <button class="btn-primary" onclick="navigateTo('shop')">Shop Now</button>
      </div>
    `;
    subtotalEl.innerText = formatPrice(0);
    shippingEl.innerText = formatPrice(0);
    taxEl.innerText = formatPrice(0);
    totalEl.innerText = formatPrice(0);
    return;
  }

  container.innerHTML = state.cart.items.map(item => {
    if (!item.product) return '';
    const image = item.product.images?.[0] || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=500';
    return `
      <div class="cart-item">
        <div class="cart-item-img">
          <img src="${image}" alt="${item.product.name}" />
        </div>
        <div class="cart-item-details">
          <span class="cart-item-brand">${item.product.brand || ''}</span>
          <h4>${item.product.name}</h4>
          <span class="cart-item-price">${formatPrice(item.price)}</span>
        </div>
        <div class="cart-qty-controls">
          <button class="qty-btn" onclick="updateCartQty('${item.product._id}', ${item.quantity - 1})">-</button>
          <span class="qty-val">${item.quantity}</span>
          <button class="qty-btn" onclick="updateCartQty('${item.product._id}', ${item.quantity + 1})">+</button>
        </div>
        <button class="cart-remove-btn" onclick="removeFromCart('${item.product._id}')" title="Remove Item">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        </button>
      </div>
    `;
  }).join('');

  // Calculations
  const subtotal = state.cart.totalPrice;
  const shipping = subtotal > 499 ? 0 : 49;
  const tax = Math.round(subtotal * 0.18);
  const total = subtotal + shipping + tax;

  subtotalEl.innerText = formatPrice(subtotal);
  shippingEl.innerText = shipping === 0 ? 'FREE' : formatPrice(shipping);
  taxEl.innerText = formatPrice(tax);
  totalEl.innerText = formatPrice(total);
}

// Update Cart Quantity
async function updateCartQty(productId, newQty) {
  try {
    const res = await api.put('/cart/update', { productId, quantity: newQty });
    state.cart = res.data.cart;
    
    // Update Badge
    const totalItems = state.cart.items.reduce((acc, item) => acc + item.quantity, 0);
    document.getElementById('cartBadge').innerText = totalItems;
    
    loadCartPage();
  } catch (error) {
    showToast(error.response?.data?.message || 'Failed to update quantity', 'error');
  }
}

// Remove from Cart
async function removeFromCart(productId) {
  try {
    const res = await api.delete(`/cart/remove/${productId}`);
    state.cart = res.data.cart;
    
    // Update Badge
    const totalItems = state.cart.items.reduce((acc, item) => acc + item.quantity, 0);
    document.getElementById('cartBadge').innerText = totalItems;
    
    showToast('Item removed.');
    loadCartPage();
  } catch (error) {
    showToast('Failed to remove item.', 'error');
  }
}

// ==========================================================================
// CHECKOUT & ORDERS
// ==========================================================================

// Checkout button action
function handleCheckoutInit() {
  if (state.cart.items.length === 0) {
    showToast('Your cart is empty.', 'warning');
    return;
  }
  openModal('checkoutModal');
}

// Handle Order Submission
async function handlePlaceOrder(e) {
  e.preventDefault();
  
  const shippingAddress = {
    fullName: document.getElementById('fullName').value,
    phone: document.getElementById('phone').value,
    address: document.getElementById('address').value,
    city: document.getElementById('city').value,
    state: document.getElementById('state').value,
    pincode: document.getElementById('pincode').value
  };

  const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
  const errorEl = document.getElementById('checkoutError');
  const placeBtn = document.getElementById('placeOrderBtn');

  try {
    errorEl.classList.add('hidden');
    placeBtn.disabled = true;
    placeBtn.innerText = 'Processing Order... ⌛';

    const res = await api.post('/orders', { shippingAddress, paymentMethod });
    
    // Clear state
    state.cart = { items: [], totalPrice: 0 };
    document.getElementById('cartBadge').innerText = '0';
    
    closeModal('checkoutModal');
    
    // Show success modal
    document.getElementById('successOrderId').innerText = `Order ID: ${res.data.order.orderId}`;
    openModal('successModal');
    
    // Reset form
    document.getElementById('checkoutForm').reset();
  } catch (error) {
    errorEl.innerText = error.response?.data?.message || 'Checkout failed. Please try again.';
    errorEl.classList.remove('hidden');
  } finally {
    placeBtn.disabled = false;
    placeBtn.innerText = 'Place Order 🎉';
  }
}

// Fetch Logged-in User Orders
async function fetchUserOrders() {
  const container = document.getElementById('ordersList');
  container.innerHTML = '<p style="text-align:center">Loading orders... 📦</p>';

  try {
    const res = await api.get('/orders/myorders');
    const orders = res.data;
    state.orders = orders;

    if (orders.length === 0) {
      container.innerHTML = `
        <div class="cart-empty">
          <div class="cart-empty-icon">📦</div>
          <h3>No orders found</h3>
          <p style="color:var(--text-muted); margin-top: 8px">You haven't placed any orders yet.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = orders.map(order => {
      const itemsHtml = order.items.map(item => `
        <div class="order-item-row">
          <span class="order-item-name">${item.name} <strong>x${item.quantity}</strong></span>
          <span>${formatPrice(item.price * item.quantity)}</span>
        </div>
      `).join('');

      const dateStr = new Date(order.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

      return `
        <div class="order-card">
          <div class="order-header">
            <div>
              <span class="order-id-label">${order.orderId}</span>
              <p style="font-size:0.8rem">${dateStr}</p>
            </div>
            <span class="order-status status-${order.orderStatus.toLowerCase()}">${order.orderStatus}</span>
          </div>
          <div class="order-items">${itemsHtml}</div>
          <div class="order-footer">
            <span style="color:var(--text-muted)">Payment: ${order.paymentMethod} (${order.paymentStatus})</span>
            <span style="font-weight:700; font-size:1.1rem">Total: ${formatPrice(order.totalAmount)}</span>
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Error fetching orders:', error);
    container.innerHTML = '<p class="form-error">Failed to load orders.</p>';
  }
}

// ==========================================================================
// ADMIN DASHBOARD OPERATIONS
// ==========================================================================
async function loadAdminDashboard() {
  if (!state.user || state.user.role !== 'admin') {
    showToast('Access denied. Admins only.', 'error');
    navigateTo('home');
    return;
  }
  
  switchAdminTab(state.admin.activeTab);
}

function switchAdminTab(tabName) {
  state.admin.activeTab = tabName;
  
  const productsBtn = document.getElementById('adminProductsTabBtn');
  const ordersBtn = document.getElementById('adminOrdersTabBtn');
  const productsSec = document.getElementById('adminProductsSection');
  const ordersSec = document.getElementById('adminOrdersSection');

  if (tabName === 'products') {
    productsBtn.classList.add('active');
    ordersBtn.classList.remove('active');
    productsSec.classList.remove('hidden');
    ordersSec.classList.add('hidden');
    fetchAdminProducts();
  } else {
    productsBtn.classList.remove('active');
    ordersBtn.classList.add('active');
    productsSec.classList.add('hidden');
    ordersSec.classList.remove('hidden');
    fetchAdminOrders();
  }
}

// Admin: Fetch all products for CRUD
async function fetchAdminProducts() {
  const tbody = document.getElementById('adminProductsList');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Loading products...</td></tr>';
  
  try {
    const res = await api.get('/products?limit=100'); // Load most products
    const products = res.data.products;
    state.admin.products = products;
    
    if (products.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No products found. Create one!</td></tr>';
      return;
    }
    
    tbody.innerHTML = products.map(p => {
      const image = p.images?.[0] || '';
      return `
        <tr>
          <td>
            <div class="admin-product-cell">
              <img src="${image}" class="admin-table-img" alt=""/>
              <div>
                <strong style="color:white">${p.name}</strong>
                <p style="font-size:0.8rem; color:var(--text-muted)">${p.brand}</p>
              </div>
            </div>
          </td>
          <td>${p.category}</td>
          <td>${formatPrice(p.price)}</td>
          <td>${p.stock}</td>
          <td>
            <div class="admin-actions-cell">
              <button class="btn-outline btn-sm" onclick="openProductEditForm('${p._id}')">✏️ Edit</button>
              <button class="btn-outline btn-sm" style="color:var(--danger); border-color:rgba(239,68,68,0.2)" onclick="handleDeleteProduct('${p._id}')">🗑️ Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('Admin loading products error:', error);
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center" class="form-error">Failed to load products.</td></tr>';
  }
}

// Admin: Fetch all store orders
async function fetchAdminOrders() {
  const tbody = document.getElementById('adminOrdersList');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">Loading orders...</td></tr>';

  try {
    const res = await api.get('/orders');
    const orders = res.data;
    state.admin.orders = orders;

    if (orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">No orders placed in the system.</td></tr>';
      return;
    }

    tbody.innerHTML = orders.map(o => {
      const dateStr = new Date(o.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short'
      });
      
      const statuses = ['Processing', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];
      const statusOptions = statuses.map(s => `
        <option value="${s}" ${o.orderStatus === s ? 'selected' : ''}>${s}</option>
      `).join('');

      return `
        <tr>
          <td><strong>${o.orderId}</strong></td>
          <td>
            <div>
              <strong style="color:white">${o.user?.name || 'Guest'}</strong>
              <p style="font-size:0.8rem; color:var(--text-muted)">${o.user?.email || ''}</p>
            </div>
          </td>
          <td>${dateStr}</td>
          <td><strong>${formatPrice(o.totalAmount)}</strong></td>
          <td>${o.paymentMethod}</td>
          <td>
            <span class="order-status status-${o.orderStatus.toLowerCase()}" id="status-label-${o._id}">${o.orderStatus}</span>
          </td>
          <td>
            <select class="admin-status-select" onchange="handleUpdateOrderStatus('${o._id}', this.value)">
              ${statusOptions}
            </select>
          </td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('Admin loading orders error:', error);
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center" class="form-error">Failed to load orders.</td></tr>';
  }
}

// Admin: Open Create Modal
function openProductCreateForm() {
  document.getElementById('productFormTitle').innerText = 'Add New Product';
  document.getElementById('productForm').reset();
  document.getElementById('formProductId').value = '';
  document.getElementById('productFormError').classList.add('hidden');
  openModal('productFormModal');
}

// Admin: Open Edit Modal
function openProductEditForm(productId) {
  const p = state.admin.products.find(prod => prod._id === productId);
  if (!p) return;

  document.getElementById('productFormTitle').innerText = 'Edit Product';
  document.getElementById('formProductId').value = p._id;
  document.getElementById('formProductName').value = p.name;
  document.getElementById('formProductCategory').value = p.category;
  document.getElementById('formProductPrice').value = p.price;
  document.getElementById('formProductOriginalPrice').value = p.originalPrice || 0;
  document.getElementById('formProductBrand').value = p.brand;
  document.getElementById('formProductStock').value = p.stock;
  document.getElementById('formProductImage').value = p.images?.[0] || '';
  document.getElementById('formProductDescription').value = p.description;
  
  document.getElementById('productFormError').classList.add('hidden');
  openModal('productFormModal');
}

// Admin: Submit Add/Edit Form
async function handleProductFormSubmit(e) {
  e.preventDefault();
  
  const id = document.getElementById('formProductId').value;
  const productData = {
    name: document.getElementById('formProductName').value,
    category: document.getElementById('formProductCategory').value,
    price: Number(document.getElementById('formProductPrice').value),
    originalPrice: Number(document.getElementById('formProductOriginalPrice').value) || 0,
    brand: document.getElementById('formProductBrand').value,
    stock: Number(document.getElementById('formProductStock').value),
    images: [document.getElementById('formProductImage').value],
    description: document.getElementById('formProductDescription').value
  };

  const errorEl = document.getElementById('productFormError');
  const saveBtn = document.getElementById('saveProductBtn');

  try {
    errorEl.classList.add('hidden');
    saveBtn.disabled = true;
    saveBtn.innerText = 'Saving...';

    if (id) {
      // Edit mode
      await api.put(`/products/${id}`, productData);
      showToast('Product updated successfully!');
    } else {
      // Create mode
      await api.post('/products', productData);
      showToast('Product added successfully!');
    }

    closeModal('productFormModal');
    fetchAdminProducts();
  } catch (error) {
    errorEl.innerText = error.response?.data?.message || 'Failed to save product details.';
    errorEl.classList.remove('hidden');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerText = 'Save Product';
  }
}

// Admin: Delete Product
async function handleDeleteProduct(productId) {
  if (!confirm('Are you sure you want to delete this product?')) return;
  
  try {
    await api.delete(`/products/${productId}`);
    showToast('Product deleted.');
    fetchAdminProducts();
  } catch (error) {
    showToast('Failed to delete product.', 'error');
  }
}

// Admin: Update Order Status
async function handleUpdateOrderStatus(orderId, newStatus) {
  try {
    await api.put(`/orders/${orderId}/status`, { status: newStatus });
    showToast(`Order status updated to ${newStatus}`);
    
    // Update labels in table
    const label = document.getElementById(`status-label-${orderId}`);
    if (label) {
      label.className = `order-status status-${newStatus.toLowerCase()}`;
      label.innerText = newStatus;
    }
  } catch (error) {
    showToast('Failed to update status.', 'error');
  }
}


// ==========================================================================
// MODALS SHOW/HIDE
// ==========================================================================
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
  }
}

// ==========================================================================
// EVENT LISTENERS & INITS
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  
  // Restore login session
  loadCurrentUser();
  
  // Fetch featured products for homepage
  fetchFeaturedProducts();

  // Navigation Links
  document.getElementById('logoLink').addEventListener('click', (e) => { e.preventDefault(); navigateTo('home'); });
  document.getElementById('shopNowBtn').addEventListener('click', () => navigateTo('shop'));
  document.getElementById('offerShopBtn').addEventListener('click', () => navigateTo('shop'));
  document.getElementById('viewDealsBtn').addEventListener('click', () => {
    state.filters.sort = 'price_asc';
    document.getElementById('sortSelect').value = 'price_asc';
    navigateTo('shop');
  });
  document.getElementById('viewAllBtn').addEventListener('click', () => navigateTo('shop'));
  document.getElementById('cartNavBtn').addEventListener('click', () => navigateTo('cart'));
  document.getElementById('myOrdersLink').addEventListener('click', (e) => { e.preventDefault(); navigateTo('orders'); });
  document.getElementById('adminDashboardLink').addEventListener('click', (e) => { e.preventDefault(); navigateTo('admin'); });
  document.getElementById('continueShoppingBtn').addEventListener('click', () => navigateTo('shop'));
  document.getElementById('successContinueBtn').addEventListener('click', () => { closeModal('successModal'); navigateTo('shop'); });

  // Profile Dropdown Toggle
  const profileDropBtn = document.getElementById('profileDropBtn');
  const profileDropdown = document.getElementById('profileDropdown');
  if (profileDropBtn) {
    profileDropBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      profileDropdown.classList.toggle('hidden');
    });
  }

  // Click outside to close dropdowns
  document.addEventListener('click', () => {
    if (profileDropdown) profileDropdown.classList.add('hidden');
  });

  // Category filter mapping on Homepage
  document.getElementById('categoriesGrid').addEventListener('click', (e) => {
    const card = e.target.closest('.category-card');
    if (card) {
      const category = card.dataset.cat;
      state.filters.category = category;
      
      // Update check states in filters panel
      const radio = document.querySelector(`input[name="category"][value="${category}"]`);
      if (radio) radio.checked = true;
      
      navigateTo('shop');
    }
  });

  // Shop Page Filters
  const categoryFilters = document.getElementById('categoryFilters');
  if (categoryFilters) {
    categoryFilters.addEventListener('change', (e) => {
      if (e.target.name === 'category') {
        state.filters.category = e.target.value;
        state.filters.page = 1;
        fetchProducts();
      }
    });
  }

  document.getElementById('applyPriceBtn').addEventListener('click', () => {
    state.filters.minPrice = document.getElementById('minPrice').value;
    state.filters.maxPrice = document.getElementById('maxPrice').value;
    state.filters.page = 1;
    fetchProducts();
  });

  document.getElementById('clearFiltersBtn').addEventListener('click', () => {
    state.filters = {
      search: '',
      category: 'All',
      minPrice: '',
      maxPrice: '',
      sort: 'newest',
      page: 1,
      limit: 12
    };
    
    // Reset elements
    document.getElementById('searchInput').value = '';
    document.querySelector('input[name="category"][value="All"]').checked = true;
    document.getElementById('minPrice').value = '';
    document.getElementById('maxPrice').value = '';
    document.getElementById('sortSelect').value = 'newest';
    
    fetchProducts();
  });

  document.getElementById('sortSelect').addEventListener('change', (e) => {
    state.filters.sort = e.target.value;
    state.filters.page = 1;
    fetchProducts();
  });

  // Search Input triggers
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');

  const executeSearch = () => {
    state.filters.search = searchInput.value;
    state.filters.page = 1;
    navigateTo('shop');
  };

  searchBtn.addEventListener('click', executeSearch);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') executeSearch();
  });

  // Modal Triggers
  document.getElementById('loginNavBtn').addEventListener('click', () => {
    openModal('authModal');
    switchAuthTab('login');
  });
  document.getElementById('signupNavBtn').addEventListener('click', () => {
    openModal('authModal');
    switchAuthTab('signup');
  });
  
  // Close Modals
  document.getElementById('closeAuthModal').addEventListener('click', () => closeModal('authModal'));
  document.getElementById('closeCheckoutModal').addEventListener('click', () => closeModal('checkoutModal'));
  document.getElementById('closeProductModal').addEventListener('click', () => closeModal('productModal'));
  document.getElementById('closeProductFormModal').addEventListener('click', () => closeModal('productFormModal'));

  // Auth switch tab listeners
  document.getElementById('loginTab').addEventListener('click', () => switchAuthTab('login'));
  document.getElementById('signupTab').addEventListener('click', () => switchAuthTab('signup'));
  document.getElementById('goToSignup').addEventListener('click', (e) => { e.preventDefault(); switchAuthTab('signup'); });
  document.getElementById('goToLogin').addEventListener('click', (e) => { e.preventDefault(); switchAuthTab('login'); });

  function switchAuthTab(tab) {
    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    if (tab === 'login') {
      loginTab.classList.add('active');
      signupTab.classList.remove('active');
      loginForm.classList.remove('hidden');
      signupForm.classList.add('hidden');
    } else {
      signupTab.classList.add('active');
      loginTab.classList.remove('active');
      signupForm.classList.remove('hidden');
      loginForm.classList.add('hidden');
    }
  }

  // Form Submits
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('signupForm').addEventListener('submit', handleSignup);
  document.getElementById('logoutBtn').addEventListener('click', (e) => { e.preventDefault(); logout(); });
  document.getElementById('checkoutBtn').addEventListener('click', handleCheckoutInit);
  document.getElementById('checkoutForm').addEventListener('submit', handlePlaceOrder);

  // Admin page tabs and products CRUD
  document.getElementById('adminProductsTabBtn').addEventListener('click', () => switchAdminTab('products'));
  document.getElementById('adminOrdersTabBtn').addEventListener('click', () => switchAdminTab('orders'));
  document.getElementById('addProductBtn').addEventListener('click', openProductCreateForm);
  document.getElementById('productForm').addEventListener('submit', handleProductFormSubmit);
});
