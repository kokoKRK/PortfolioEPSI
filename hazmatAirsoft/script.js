const SUPABASE_URL = "https://hevvkobbolyjuamiusqz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_dFbZ0ujTaFd5FkkJy598Vw_px7xuBxQ";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== AUTH STATE =====
let currentUser = null;

function getSessionId() {
  let sid = localStorage.getItem('hazmat_session_id');
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem('hazmat_session_id', sid);
  }
  return sid;
}

function getCartIdentifier() {
  if (currentUser) {
    return { user_id: currentUser.id };
  }
  return { session_id: getSessionId() };
}

// ===== AUTH FUNCTIONS =====
async function signUp(email, password, fullName) {
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } }
  });
  if (error) throw error;

  if (data.user) {
    await migrateCartToUser(data.user.id);
  }
  return data;
}

async function signIn(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;

  if (data.user) {
    await migrateCartToUser(data.user.id);
  }
  return data;
}

async function signInWithGoogle() {
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + window.location.pathname
    }
  });
  if (error) throw error;
}

async function signOut() {
  await supabaseClient.auth.signOut();
  currentUser = null;
  updateAuthUI();
  await loadCart();
}

async function migrateCartToUser(userId) {
  const sessionId = getSessionId();

  const { data: anonItems } = await supabaseClient
    .from('cart_items')
    .select('id, product_id, quantity')
    .eq('session_id', sessionId)
    .is('user_id', null);

  if (!anonItems || anonItems.length === 0) return;

  for (const item of anonItems) {
    const { data: existing } = await supabaseClient
      .from('cart_items')
      .select('id, quantity')
      .eq('user_id', userId)
      .eq('product_id', item.product_id)
      .maybeSingle();

    if (existing) {
      await supabaseClient
        .from('cart_items')
        .update({ quantity: existing.quantity + item.quantity })
        .eq('id', existing.id);
      await supabaseClient.from('cart_items').delete().eq('id', item.id);
    } else {
      await supabaseClient
        .from('cart_items')
        .update({ user_id: userId, session_id: null })
        .eq('id', item.id);
    }
  }
}

function updateAuthUI() {
  const authBtn = document.getElementById('authBtn');
  const userMenu = document.getElementById('userMenu');
  const userName = document.getElementById('userName');
  const userAvatar = document.getElementById('userAvatar');
  const cartBtn = document.getElementById('cartBtn');

  if (currentUser) {
    authBtn.style.display = 'none';
    userMenu.style.display = 'flex';
    cartBtn.style.display = '';
    const name = currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];
    userName.textContent = name;
    userAvatar.textContent = name.charAt(0).toUpperCase();
  } else {
    authBtn.style.display = '';
    userMenu.style.display = 'none';
    cartBtn.style.display = 'none';
  }

  document.querySelectorAll('.add-to-cart').forEach(btn => {
    if (currentUser) {
      btn.style.display = '';
    } else {
      btn.style.display = 'none';
    }
  });
}

async function initAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session?.user) {
    currentUser = session.user;
  }
  updateAuthUI();

  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    const prevUser = currentUser;
    currentUser = session?.user || null;
    updateAuthUI();

    if (event === 'SIGNED_IN' && currentUser && !prevUser) {
      await migrateCartToUser(currentUser.id);
      await loadCart();
      closeAuthModal();
      const name = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || '';
      showToast(`Bienvenue ${name} !`);
    }
  });
}

// ===== AUTH MODAL =====
function openAuthModal(showRegisterFirst = false) {
  document.getElementById('authOverlay').classList.add('active');
  document.getElementById('authModal').classList.add('active');
  document.body.style.overflow = 'hidden';

  document.getElementById('loginForm').style.display = showRegisterFirst ? 'none' : 'block';
  document.getElementById('registerForm').style.display = showRegisterFirst ? 'block' : 'none';
  document.getElementById('loginError').textContent = '';
  document.getElementById('registerError').textContent = '';
}

function closeAuthModal() {
  document.getElementById('authOverlay').classList.remove('active');
  document.getElementById('authModal').classList.remove('active');
  document.body.style.overflow = '';
}

// ===== CATEGORY HELPERS =====
function normalizeCategory(category) {
  const map = {
    'shotguns': 'shotguns',
    'grosses armes': 'grosses-armes',
    'petites armes': 'petites-armes',
    'snipers': 'snipers'
  };
  return map[category] || category;
}

function displayCategoryLabel(category) {
  const map = {
    'shotguns': 'Shotgun',
    'grosses armes': 'Grosse Arme',
    'petites armes': 'Petite Arme',
    'snipers': 'Sniper'
  };
  return map[category] || category;
}

// ===== RENDER PRODUCTS =====
function renderProducts(products) {
  const productsGrid = document.getElementById('productsGrid');

  productsGrid.innerHTML = products.map(product => `
    <div class="product-card fade-in" data-category="${normalizeCategory(product.category)}">
      ${product.badge ? `<div class="product-badge">${product.badge}</div>` : ''}
      <div class="product-img">
        <img src="${product.image_url || ''}" alt="${product.name}" loading="lazy">
      </div>
      <div class="product-info">
        <span class="product-cat">${displayCategoryLabel(product.category)}</span>
        <h3>${product.name}</h3>
        <p>${product.description || ''}</p>
        <div class="product-bottom">
          <span class="product-price">${Number(product.price).toFixed(2).replace('.', ',')} €</span>
          <button 
            class="btn btn-sm btn-primary add-to-cart"
            data-id="${product.id}"
            data-name="${product.name}"
            data-price="${product.price}">
            Ajouter
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// ===== LOAD PRODUCTS =====
async function loadProducts() {
  const { data, error } = await supabaseClient
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erreur chargement produits :', error);
    return;
  }

  renderProducts(data);
  bindFilterButtons();
  bindAddToCartButtons();
  updateAuthUI();

  requestAnimationFrame(() => {
    document.querySelectorAll('.product-card.fade-in').forEach(card => {
      if (window._productObserver) {
        window._productObserver.observe(card);
      } else {
        card.classList.add('visible');
      }
    });
  });
}

// ===== FILTER BUTTONS =====
function bindFilterButtons() {
  const filterBtns = document.querySelectorAll('.filter-btn');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;
      document.querySelectorAll('.product-card').forEach(card => {
        if (filter === 'all' || card.dataset.category === filter) {
          card.classList.remove('hidden');
          card.style.animation = 'fadeInUp 0.4s ease forwards';
        } else {
          card.classList.add('hidden');
        }
      });
    });
  });
}

// ===== SUPABASE CART =====
async function addToCart(productId) {
  if (!currentUser) {
    openAuthModal(false);
    showToast('Connectez-vous pour ajouter au panier.');
    return;
  }

  const pid = Number(productId);

  const { data: existing, error: fetchErr } = await supabaseClient
    .from('cart_items')
    .select('id, quantity')
    .eq('user_id', currentUser.id)
    .eq('product_id', pid)
    .maybeSingle();

  if (fetchErr) {
    console.error('Erreur lecture panier:', fetchErr);
    showToast('Erreur panier — vérifiez la console.');
    return;
  }

  if (existing) {
    const { error } = await supabaseClient
      .from('cart_items')
      .update({ quantity: existing.quantity + 1 })
      .eq('id', existing.id);
    if (error) {
      console.error('Erreur update panier:', error);
      showToast('Erreur mise à jour — ' + error.message);
      return;
    }
  } else {
    const row = {
      user_id: currentUser.id,
      session_id: getSessionId(),
      product_id: pid,
      quantity: 1
    };
    const { error } = await supabaseClient
      .from('cart_items')
      .insert(row);
    if (error) {
      console.error('Erreur insert panier:', error);
      showToast('Erreur ajout — ' + error.message);
      return;
    }
  }

  await loadCart();
}

async function removeFromCart(cartItemId) {
  await supabaseClient.from('cart_items').delete().eq('id', cartItemId);
  await loadCart();
}

async function updateQuantity(cartItemId, newQty) {
  if (newQty <= 0) return removeFromCart(cartItemId);

  await supabaseClient
    .from('cart_items')
    .update({ quantity: newQty })
    .eq('id', cartItemId);

  await loadCart();
}

async function clearCart() {
  if (!currentUser) return;
  await supabaseClient.from('cart_items').delete().eq('user_id', currentUser.id);
}

async function loadCart() {
  if (!currentUser) {
    renderCart([]);
    return;
  }

  const { data, error } = await supabaseClient
    .from('cart_items')
    .select('id, quantity, products(id, name, price, image_url)')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erreur chargement panier :', error);
    return;
  }

  renderCart(data || []);
}

// ===== CHECKOUT / STRIPE =====
async function startCheckout(address, city, zipCode) {
  if (!currentUser) return;

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    showToast('Session expirée, reconnectez-vous.');
    return;
  }

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/create-checkout`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        address,
        city,
        zip_code: zipCode,
        success_url: window.location.origin + window.location.pathname + '?payment=success',
        cancel_url: window.location.origin + window.location.pathname + '?payment=cancel',
      }),
    }
  );

  const data = await response.json();

  if (!response.ok || !data.url) {
    console.error('Checkout error:', data);
    throw new Error(data.error || 'Erreur lors de la création du paiement.');
  }

  window.location.href = data.url;
}

function handlePaymentReturn() {
  const params = new URLSearchParams(window.location.search);
  const paymentStatus = params.get('payment');

  if (paymentStatus === 'success') {
    window.history.replaceState({}, '', window.location.pathname);
    setTimeout(() => {
      document.getElementById('successOverlay').classList.add('active');
      document.getElementById('successModal').classList.add('active');
      document.getElementById('successMsg').textContent =
        'Votre paiement a été accepté et votre commande est confirmée.';
      document.getElementById('successOrderId').textContent =
        'Vous pouvez consulter vos commandes dans votre profil.';
      document.body.style.overflow = 'hidden';
      loadCart();
    }, 500);
  } else if (paymentStatus === 'cancel') {
    window.history.replaceState({}, '', window.location.pathname);
    showToast('Paiement annulé.');
  }
}

function renderCart(items) {
  const cartItems = document.getElementById('cartItems');
  const cartFooter = document.getElementById('cartFooter');
  const cartCount = document.getElementById('cartCount');
  const cartTotal = document.getElementById('cartTotal');

  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  cartCount.textContent = totalCount;

  if (items.length === 0) {
    cartItems.innerHTML = '<p class="cart-empty">Votre panier est vide.</p>';
    cartFooter.style.display = 'none';
    return;
  }

  cartItems.innerHTML = items.map(item => {
    const product = item.products;
    const lineTotal = (product.price * item.quantity).toFixed(2).replace('.', ',');
    return `
      <div class="cart-item">
        <div class="cart-item-img">
          <img src="${product.image_url || ''}" alt="${product.name}">
        </div>
        <div class="cart-item-details">
          <h4>${product.name}</h4>
          <span class="cart-item-price">${lineTotal} €</span>
          <div class="cart-item-qty">
            <button class="qty-btn" data-cart-id="${item.id}" data-qty="${item.quantity - 1}">−</button>
            <span>${item.quantity}</span>
            <button class="qty-btn" data-cart-id="${item.id}" data-qty="${item.quantity + 1}">+</button>
          </div>
        </div>
        <button class="cart-item-remove" data-cart-id="${item.id}" aria-label="Retirer">&times;</button>
      </div>
    `;
  }).join('');

  const total = items.reduce((sum, item) => sum + (item.products.price * item.quantity), 0);
  cartTotal.textContent = total.toFixed(2).replace('.', ',') + ' €';
  cartFooter.style.display = 'block';

  cartItems.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', () => removeFromCart(btn.dataset.cartId));
  });

  cartItems.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      updateQuantity(btn.dataset.cartId, parseInt(btn.dataset.qty));
    });
  });
}

// ===== ADD TO CART BUTTONS =====
function bindAddToCartButtons() {
  document.querySelectorAll('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!currentUser) {
        openAuthModal(false);
        return;
      }

      const productId = btn.dataset.id;
      const productName = btn.dataset.name;

      btn.disabled = true;
      btn.textContent = '...';

      await addToCart(productId);
      showToast(`${productName} ajouté au panier`);

      btn.textContent = '✓ Ajouté';
      btn.style.background = '#2E7D32';

      setTimeout(() => {
        btn.textContent = 'Ajouter';
        btn.style.background = '';
        btn.disabled = false;
      }, 1500);
    });
  });
}

// ===== CHECKOUT =====
function openCheckout() {
  if (!currentUser) return;

  const cartItems = document.querySelectorAll('.cart-item');
  if (cartItems.length === 0) return;

  const summary = document.getElementById('checkoutSummary');
  const totalEl = document.getElementById('cartTotal');

  let html = '';
  cartItems.forEach(item => {
    const name = item.querySelector('h4')?.textContent || '';
    const price = item.querySelector('.cart-item-price')?.textContent || '';
    const qty = item.querySelector('.cart-item-qty span')?.textContent || '1';
    html += `<div class="checkout-item">
      <span class="checkout-item-name">${name}</span>
      <span class="checkout-item-qty">x${qty}</span>
      <span class="checkout-item-price">${price}</span>
    </div>`;
  });
  summary.innerHTML = html;

  document.getElementById('checkoutTotal').innerHTML =
    `<span>Total à payer</span><span>${totalEl.textContent}</span>`;

  document.getElementById('cartOverlay').classList.remove('active');
  document.getElementById('cartSidebar').classList.remove('active');

  document.getElementById('checkoutOverlay').classList.add('active');
  document.getElementById('checkoutModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeCheckout() {
  document.getElementById('checkoutOverlay').classList.remove('active');
  document.getElementById('checkoutModal').classList.remove('active');
  document.body.style.overflow = '';
}

function showOrderSuccess() {
  closeCheckout();
  document.getElementById('successOverlay').classList.add('active');
  document.getElementById('successModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeSuccessModal() {
  document.getElementById('successOverlay').classList.remove('active');
  document.getElementById('successModal').classList.remove('active');
  document.body.style.overflow = '';
}

// ===== TOAST =====
function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ===== DOM READY =====
document.addEventListener('DOMContentLoaded', () => {

  // ===== NAVBAR SCROLL =====
  const navbar = document.getElementById('navbar');
  const backToTop = document.getElementById('backToTop');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
    backToTop.classList.toggle('visible', window.scrollY > 500);
  });

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ===== MOBILE MENU =====
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('active');
    document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
  });

  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      navLinks.classList.remove('active');
      document.body.style.overflow = '';
    });
  });

  // ===== CATEGORY CARDS → FILTER =====
  document.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      const category = card.dataset.category;
      const targetBtn = document.querySelector(`.filter-btn[data-filter="${category}"]`);
      if (targetBtn) {
        targetBtn.click();
        document.getElementById('produits').scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // ===== CART SIDEBAR =====
  const cartBtn = document.getElementById('cartBtn');
  const cartOverlay = document.getElementById('cartOverlay');
  const cartSidebar = document.getElementById('cartSidebar');
  const cartClose = document.getElementById('cartClose');

  cartBtn.addEventListener('click', () => {
    cartOverlay.classList.add('active');
    cartSidebar.classList.add('active');
    document.body.style.overflow = 'hidden';
  });

  cartClose.addEventListener('click', () => {
    cartOverlay.classList.remove('active');
    cartSidebar.classList.remove('active');
    document.body.style.overflow = '';
  });

  cartOverlay.addEventListener('click', () => {
    cartOverlay.classList.remove('active');
    cartSidebar.classList.remove('active');
    document.body.style.overflow = '';
  });

  // ===== CHECKOUT =====
  document.getElementById('checkoutBtn').addEventListener('click', openCheckout);
  document.getElementById('checkoutClose').addEventListener('click', closeCheckout);
  document.getElementById('checkoutOverlay').addEventListener('click', closeCheckout);
  document.getElementById('successCloseBtn').addEventListener('click', closeSuccessModal);
  document.getElementById('successOverlay').addEventListener('click', closeSuccessModal);

  document.getElementById('checkoutForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('checkoutError');
    const submitBtn = document.getElementById('checkoutSubmitBtn');
    errorEl.textContent = '';

    const address = document.getElementById('checkoutAddress').value.trim();
    const city = document.getElementById('checkoutCity').value.trim();
    const zip = document.getElementById('checkoutZip').value.trim();

    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Redirection vers Stripe...';

    try {
      await startCheckout(address, city, zip);
    } catch (err) {
      errorEl.textContent = err.message || 'Erreur lors du paiement.';
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Payer avec Stripe`;
    }
  });

  handlePaymentReturn();

  // ===== AUTH MODAL =====
  document.getElementById('authBtn').addEventListener('click', () => openAuthModal(false));
  document.getElementById('authModalClose').addEventListener('click', closeAuthModal);
  document.getElementById('authOverlay').addEventListener('click', closeAuthModal);

  // Google OAuth buttons
  document.getElementById('googleLoginBtn').addEventListener('click', async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      document.getElementById('loginError').textContent = err.message;
    }
  });

  document.getElementById('googleRegisterBtn').addEventListener('click', async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      document.getElementById('registerError').textContent = err.message;
    }
  });

  document.getElementById('showRegister').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    document.getElementById('registerError').textContent = '';
  });

  document.getElementById('showLogin').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('loginError').textContent = '';
  });

  // Login form
  document.getElementById('loginFormEl').addEventListener('submit', async (e) => {
    e.preventDefault();
    const loginError = document.getElementById('loginError');
    const submitBtn = document.getElementById('loginSubmit');
    loginError.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Connexion...';

    try {
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      await signIn(email, password);
      closeAuthModal();
      showToast('Connexion réussie !');
      await loadCart();
    } catch (err) {
      loginError.textContent = err.message === 'Invalid login credentials'
        ? 'Email ou mot de passe incorrect.'
        : err.message;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Se connecter';
    }
  });

  // Register form
  document.getElementById('registerFormEl').addEventListener('submit', async (e) => {
    e.preventDefault();
    const registerError = document.getElementById('registerError');
    const submitBtn = document.getElementById('registerSubmit');
    registerError.textContent = '';

    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerPasswordConfirm').value;

    if (password !== confirmPassword) {
      registerError.textContent = 'Les mots de passe ne correspondent pas.';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Création...';

    try {
      await signUp(email, password, name);
      closeAuthModal();
      showToast(`Bienvenue ${name} ! Compte créé avec succès.`);
      await loadCart();
    } catch (err) {
      if (err.message.includes('already registered')) {
        registerError.textContent = 'Cet email est déjà utilisé.';
      } else {
        registerError.textContent = err.message;
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Créer mon compte';
    }
  });

  // User menu dropdown
  document.getElementById('userMenuBtn').addEventListener('click', () => {
    document.getElementById('userDropdown').classList.toggle('active');
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) {
      document.getElementById('userDropdown').classList.remove('active');
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', async (e) => {
    e.preventDefault();
    await signOut();
    showToast('Déconnexion réussie.');
  });

  // ===== SCROLL ANIMATIONS =====
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  window._productObserver = observer;

  document.querySelectorAll(
    '.category-card, .product-card, .advantage-card, .stat, .about-content, .newsletter-content, .contact-form, .review-card'
  ).forEach(el => {
    el.classList.add('fade-in');
    observer.observe(el);
  });

  // ===== FORMS =====
  document.getElementById('newsletterForm').addEventListener('submit', (e) => {
    e.preventDefault();
    showToast('Inscription réussie ! Bienvenue chez Hazmat Airsoft.');
    e.target.reset();
  });

  document.getElementById('contactForm').addEventListener('submit', (e) => {
    e.preventDefault();
    showToast('Message envoyé ! Nous vous répondrons rapidement.');
    e.target.reset();
  });

  // ===== ACTIVE NAV LINK =====
  const sections = document.querySelectorAll('section[id]');

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY + 100;
    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');
      const link = document.querySelector(`.nav-links a[href="#${id}"]`);
      if (link) {
        link.style.color = (scrollY >= top && scrollY < top + height) ? 'var(--white)' : '';
      }
    });
  });

  // ===== INIT =====
  initAuth().then(() => {
    loadProducts();
    loadCart();
  });
});
