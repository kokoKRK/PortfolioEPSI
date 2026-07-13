const SUPABASE_URL = "https://hevvkobbolyjuamiusqz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_dFbZ0ujTaFd5FkkJy598Vw_px7xuBxQ";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

async function initProfile() {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session?.user) {
    window.location.href = 'index.html';
    return;
  }

  currentUser = session.user;
  populateProfile();
  setupEventListeners();
  loadProfileCart();
  loadProfileOrders();
}

function populateProfile() {
  const name = currentUser.user_metadata?.full_name
    || currentUser.user_metadata?.name
    || currentUser.email.split('@')[0];
  const email = currentUser.email;
  const provider = currentUser.app_metadata?.provider;

  document.getElementById('profileTitle').textContent = name;
  document.getElementById('profileEmail').textContent = email;
  document.getElementById('profileAvatarLg').textContent = name.charAt(0).toUpperCase();
  document.getElementById('profileName').value = name;
  document.getElementById('profileEmailField').value = email;

  // Navbar
  document.getElementById('userName').textContent = name;
  document.getElementById('userAvatar').textContent = name.charAt(0).toUpperCase();

  // Provider badge
  if (provider === 'google') {
    document.getElementById('profileProvider').textContent = 'Connecté via Google';
    document.getElementById('passwordSection').style.display = 'none';
  } else {
    document.getElementById('profileProvider').textContent = '';
    document.getElementById('passwordSection').style.display = '';
  }
}

function setupEventListeners() {
  // User menu dropdown
  document.getElementById('userMenuBtn').addEventListener('click', () => {
    document.getElementById('userDropdown').classList.toggle('active');
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) {
      document.getElementById('userDropdown').classList.remove('active');
    }
  });

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', async (e) => {
    e.preventDefault();
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
  });

  // Save profile info
  document.getElementById('profileInfoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('infoMsg');
    const btn = document.getElementById('saveInfoBtn');
    const newName = document.getElementById('profileName').value.trim();

    if (!newName) {
      msg.textContent = 'Le nom ne peut pas être vide.';
      msg.className = 'profile-msg error';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Enregistrement...';
    msg.textContent = '';

    try {
      const { error } = await supabaseClient.auth.updateUser({
        data: { full_name: newName }
      });
      if (error) throw error;

      await supabaseClient
        .from('profiles')
        .update({ full_name: newName })
        .eq('id', currentUser.id);

      currentUser.user_metadata.full_name = newName;
      populateProfile();

      msg.textContent = 'Profil mis à jour.';
      msg.className = 'profile-msg success';
    } catch (err) {
      msg.textContent = err.message;
      msg.className = 'profile-msg error';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Enregistrer';
    }
  });

  // Change password
  document.getElementById('passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('passwordMsg');
    const btn = document.getElementById('savePasswordBtn');
    const newPwd = document.getElementById('newPassword').value;
    const confirmPwd = document.getElementById('confirmNewPassword').value;

    if (newPwd !== confirmPwd) {
      msg.textContent = 'Les mots de passe ne correspondent pas.';
      msg.className = 'profile-msg error';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Mise à jour...';
    msg.textContent = '';

    try {
      const { error } = await supabaseClient.auth.updateUser({
        password: newPwd
      });
      if (error) throw error;

      msg.textContent = 'Mot de passe mis à jour.';
      msg.className = 'profile-msg success';
      document.getElementById('passwordForm').reset();
    } catch (err) {
      msg.textContent = err.message;
      msg.className = 'profile-msg error';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Mettre à jour';
    }
  });

  // Delete account
  const confirmOverlay = document.getElementById('confirmOverlay');
  const confirmModal = document.getElementById('confirmModal');
  const confirmInput = document.getElementById('confirmDeleteInput');
  const confirmBtn = document.getElementById('confirmDeleteBtn');

  document.getElementById('deleteAccountBtn').addEventListener('click', () => {
    confirmOverlay.classList.add('active');
    confirmModal.classList.add('active');
    confirmInput.value = '';
    confirmBtn.disabled = true;
  });

  document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
    confirmOverlay.classList.remove('active');
    confirmModal.classList.remove('active');
  });

  confirmOverlay.addEventListener('click', () => {
    confirmOverlay.classList.remove('active');
    confirmModal.classList.remove('active');
  });

  confirmInput.addEventListener('input', () => {
    confirmBtn.disabled = confirmInput.value !== 'SUPPRIMER';
  });

  confirmBtn.addEventListener('click', async () => {
    if (confirmInput.value !== 'SUPPRIMER') return;

    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Suppression...';

    try {
      await supabaseClient
        .from('cart_items')
        .delete()
        .eq('user_id', currentUser.id);

      await supabaseClient
        .from('orders')
        .delete()
        .eq('user_id', currentUser.id);

      await supabaseClient
        .from('profiles')
        .delete()
        .eq('id', currentUser.id);

      const { error } = await supabaseClient.rpc('delete_own_account');
      if (error) console.error('RPC delete_own_account error:', error);
    } catch (err) {
      console.error('Delete account error:', err);
    } finally {
      try { await supabaseClient.auth.signOut(); } catch (_) {}
      localStorage.removeItem('hazmat_session_id');
      window.location.href = 'index.html';
    }
  });
}

// ===== PROFILE CART =====
async function loadProfileCart() {
  const container = document.getElementById('profileCart');
  const footer = document.getElementById('profileCartFooter');

  const { data, error } = await supabaseClient
    .from('cart_items')
    .select('id, quantity, products(id, name, price, image_url)')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: true });

  if (error) {
    container.innerHTML = '<p class="profile-empty">Erreur de chargement.</p>';
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = '<p class="profile-empty">Votre panier est vide.</p>';
    footer.style.display = 'none';
    return;
  }

  container.innerHTML = data.map(item => {
    const p = item.products;
    const lineTotal = (p.price * item.quantity).toFixed(2).replace('.', ',');
    return `<div class="profile-cart-item">
      <div class="profile-cart-item-img">
        <img src="${p.image_url || ''}" alt="${p.name}">
      </div>
      <div class="profile-cart-item-info">
        <h4>${p.name}</h4>
        <span>Qté: ${item.quantity}</span>
      </div>
      <span class="profile-cart-item-price">${lineTotal} €</span>
    </div>`;
  }).join('');

  const total = data.reduce((sum, item) => sum + (item.products.price * item.quantity), 0);
  document.getElementById('profileCartTotal').textContent = total.toFixed(2).replace('.', ',') + ' €';
  footer.style.display = 'flex';
}

// ===== PROFILE ORDERS =====
async function loadProfileOrders() {
  const container = document.getElementById('profileOrders');

  const { data: orders, error } = await supabaseClient
    .from('orders')
    .select('id, total, status, address, city, zip_code, card_last4, created_at')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error) {
    container.innerHTML = '<p class="profile-empty">Erreur de chargement.</p>';
    return;
  }

  if (!orders || orders.length === 0) {
    container.innerHTML = '<p class="profile-empty">Aucune commande pour le moment.</p>';
    return;
  }

  let html = '';
  for (const order of orders) {
    const { data: items } = await supabaseClient
      .from('order_items')
      .select('quantity, unit_price, products(name)')
      .eq('order_id', order.id);

    const date = new Date(order.created_at).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const statusMap = {
      confirmed: { label: 'Confirmée', cls: 'status-confirmed' },
      pending: { label: 'En attente', cls: 'status-pending' },
      shipped: { label: 'Expédiée', cls: 'status-shipped' }
    };
    const st = statusMap[order.status] || statusMap.confirmed;

    const itemsHtml = (items || []).map(i =>
      `<div class="profile-order-item">
        <span>${i.products?.name || 'Produit'} × ${i.quantity}</span>
        <span>${(i.unit_price * i.quantity).toFixed(2).replace('.', ',')} €</span>
      </div>`
    ).join('');

    html += `<div class="profile-order">
      <div class="profile-order-header">
        <span class="profile-order-id">#${order.id.substring(0, 8).toUpperCase()}</span>
        <span class="profile-order-date">${date}</span>
        <span class="profile-order-status ${st.cls}">${st.label}</span>
      </div>
      <div class="profile-order-items">${itemsHtml}</div>
      <div class="profile-order-footer">
        <div>
          <span>Total</span>
          ${order.card_last4 ? `<p class="profile-order-card">Carte •••• ${order.card_last4}</p>` : ''}
        </div>
        <span class="profile-order-total">${Number(order.total).toFixed(2).replace('.', ',')} €</span>
      </div>
    </div>`;
  }

  container.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', initProfile);
