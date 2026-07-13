const STATIC_PRODUCTS = [
  { id: 'spas12', name: 'Spas-12', category: 'shotguns', description: 'Réplique airsoft inspirée du fusil à pompe Spas-12 de Rust.', image_url: 'img/spas12.png' },
  { id: 'db', name: 'Double Barrel', category: 'shotguns', description: 'Réplique du double canon iconique de Rust, finitions brut et authentiques.', image_url: 'img/db.png' },
  { id: 'shotgun-m4', name: 'Shotgun M4', category: 'shotguns', description: 'Version tactique inspirée de l\'univers survival de Rust.', image_url: 'img/shotgun-m4.png' },
  { id: 'ak47', name: 'AK-47', category: 'grosses-armes', description: 'Réplique culte de Rust : smiley, crosse en lance-pierre, style artisanal.', image_url: 'img/ak47.png', badge: 'Best-seller' },
  { id: 'mpa5', name: 'MPA5', category: 'grosses-armes', description: 'SMG compacte inspirée des armes de milieu de partie dans Rust.', image_url: 'img/mpa5.png' },
  { id: 'sar', name: 'SAR', category: 'grosses-armes', description: 'Semi-automatique rustique, fidèle à l\'esthétique du jeu.', image_url: 'img/sar.png' },
  { id: 'm39', name: 'M39', category: 'grosses-armes', description: 'Fusil semi-auto inspiré de la progression mid-game de Rust.', image_url: 'img/m39.png' },
  { id: 'lr300', name: 'LR-300', category: 'grosses-armes', description: 'Réplique premium de l\'arme de fin de partie la plus convoitée de Rust.', image_url: 'img/lr300.png', badge: 'Premium' },
  { id: 'smg-maison', name: 'SMG Maison', category: 'grosses-armes', description: 'SMG bricolée, esprit survival et craft du jeu Rust.', image_url: 'img/smg-maison.png' },
  { id: 'thomy', name: 'Thompson', category: 'grosses-armes', description: 'Thompson au look rouillé : scotch, métal vieilli, pur vibe Rust.', image_url: 'img/thomy.png' },
  { id: 'p2', name: 'P2', category: 'petites-armes', description: 'Pistolet semi-auto inspiré de l\'arme de départ Rust.', image_url: 'img/p2.png' },
  { id: 'revo', name: 'Revolver', category: 'petites-armes', description: 'Revolver robuste, esthétique survival du jeu Rust.', image_url: 'img/revo.png' },
  { id: 'python', name: 'Python', category: 'petites-armes', description: 'Revolver lourd et détaillé, référence visuelle 1:1 avec Rust.', image_url: 'img/python.png' },
  { id: 'sniper-bolt', name: 'Sniper Bolt', category: 'snipers', description: 'Fusil à verrou longue portée, inspiré du bolt action de Rust.', image_url: 'img/sniper-bolt.png' },
  { id: 'sniper-l39', name: 'Sniper L96', category: 'snipers', description: 'Sniper de précision inspirée de la L96 du jeu Rust.', image_url: 'img/sniper-l39.png' },
  { id: 'sniper-semi', name: 'Sniper Semi-Auto', category: 'snipers', description: 'Sniper semi-automatique, finitions métal et style survival.', image_url: 'img/sniper-semi.png' }
];

const CATEGORY_LABELS = {
  shotguns: 'Shotguns',
  'grosses-armes': 'Grosses armes',
  'petites-armes': 'Petites armes',
  snipers: 'Snipers'
};

function renderVitrineProducts(products) {
  const productsGrid = document.getElementById('productsGrid');
  if (!productsGrid) return;

  productsGrid.innerHTML = products.map((product) => `
    <div class="product-card fade-in visible" data-category="${product.category}">
      ${product.badge ? `<div class="product-badge">${product.badge}</div>` : ''}
      <div class="product-img">
        <img src="${product.image_url}" alt="${product.name} — réplique airsoft inspirée de Rust" loading="lazy">
      </div>
      <div class="product-info">
        <span class="product-cat">${CATEGORY_LABELS[product.category] || product.category}</span>
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        <div class="product-bottom product-bottom-vitrine">
          <span class="product-rust-tag">Inspirée de Rust</span>
          <a href="#contact" class="btn btn-sm btn-outline">Nous contacter</a>
        </div>
      </div>
    </div>
  `).join('');
}

function bindFilterButtons() {
  const filterBtns = document.querySelectorAll('.filter-btn');

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;
      document.querySelectorAll('.product-card').forEach((card) => {
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

document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('vitrine-mode');

  const navbar = document.getElementById('navbar');
  const backToTop = document.getElementById('backToTop');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
    backToTop.classList.toggle('visible', window.scrollY > 500);
  });

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('active');
    document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
  });

  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      navLinks.classList.remove('active');
      document.body.style.overflow = '';
    });
  });

  document.querySelectorAll('.category-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      const category = card.dataset.category;
      const targetBtn = document.querySelector(`.filter-btn[data-filter="${category}"]`);
      if (targetBtn) {
        targetBtn.click();
        document.getElementById('repliques').scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  renderVitrineProducts(STATIC_PRODUCTS);
  bindFilterButtons();

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll(
    '.category-card, .product-card, .advantage-card, .stat, .about-content, .newsletter-content, .contact-form, .review-card'
  ).forEach((el) => {
    el.classList.add('fade-in');
    observer.observe(el);
  });

  const newsletterForm = document.getElementById('newsletterForm');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      showToast('Merci ! Nous vous tiendrons informé de l\'ouverture de la boutique.');
      e.target.reset();
    });
  }

  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      showToast('Message envoyé ! Nous vous répondrons rapidement.');
      e.target.reset();
    });
  }

  const sections = document.querySelectorAll('section[id]');
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY + 100;
    sections.forEach((section) => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');
      const link = document.querySelector(`.nav-links a[href="#${id}"]`);
      if (link) {
        link.style.color = (scrollY >= top && scrollY < top + height) ? 'var(--white)' : '';
      }
    });
  });
});
