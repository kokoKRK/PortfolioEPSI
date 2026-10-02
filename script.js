// Portfolio — Grinda Korto
// Système de mouvement « le set » : un playhead orange guide la lecture.
// Vanilla : un seul ticker rAF (actif uniquement quand quelque chose bouge),
// IntersectionObserver pour les révélations, lerp pour la douceur.
// Aucune dépendance. prefers-reduced-motion → état final immédiat.
// ============================================================

const html = document.documentElement;
html.classList.add('js');

const PREFERS_REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const DESKTOP_MQ = window.matchMedia('(min-width: 901px)');
const isDesktop = () => DESKTOP_MQ.matches;
// Effets pointeur (magnétisme, parallax souris, spotlight) : desktop + souris uniquement
const ENHANCED = !PREFERS_REDUCED_MOTION && FINE_POINTER;
const HEADER_OFFSET = 72;
const THEME_KEY = 'gk-theme';

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const settled = (a, b, eps) => Math.abs(a - b) < (eps || 0.05);

// ------------------------------------------------------------
// Mode sombre / clair — persistance + sync theme-color
// ------------------------------------------------------------
(function themeController() {
  const syncMeta = () => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    const color = getComputedStyle(html).getPropertyValue('--theme-color').trim() || '#edeff3';
    meta.setAttribute('content', color);
  };

  const apply = (theme) => {
    if (theme === 'dark') html.setAttribute('data-theme', 'dark');
    else html.removeAttribute('data-theme');
    const dark = theme === 'dark';
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.setAttribute('aria-label', dark ? 'Activer le mode clair' : 'Activer le mode sombre');
      btn.setAttribute('title', dark ? 'Mode clair' : 'Mode sombre');
    });
    syncMeta();
  };

  const current = () => (html.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

  const ensureToggle = () => {
    if (document.querySelector('[data-theme-toggle]')) return;
    const nav = document.querySelector('.site-header .nav');
    if (!nav) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-toggle';
    btn.setAttribute('data-theme-toggle', '');
    btn.innerHTML = `
      <svg class="icon-moon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M20 14.5A7.5 7.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" stroke-linejoin="round"/>
      </svg>
      <svg class="icon-sun" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8">
        <circle cx="12" cy="12" r="4"/>
        <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M17.2 6.8l1.6-1.6M5.2 18.8l1.6-1.6" stroke-linecap="round"/>
      </svg>`;
    const toggle = nav.querySelector('.nav-toggle');
    if (toggle) nav.insertBefore(btn, toggle);
    else nav.appendChild(btn);
  };

  ensureToggle();
  apply(current());

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-theme-toggle]');
    if (!btn) return;
    const next = current() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(THEME_KEY, next); } catch (err) {}
    apply(next);
  });

  try {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (localStorage.getItem(THEME_KEY)) return;
      apply(e.matches ? 'dark' : 'light');
    });
  } catch (err) {}
})();

// ------------------------------------------------------------
// Ticker : une boucle rAF unique. Chaque abonné renvoie `true`
// tant qu'il a encore quelque chose à interpoler ; sinon la boucle
// s'arrête d'elle-même (zéro CPU au repos).
// ------------------------------------------------------------
const Ticker = (() => {
  const fns = new Set();
  let running = false;
  const loop = () => {
    let busy = false;
    fns.forEach((fn) => { if (fn() === true) busy = true; });
    if (busy) requestAnimationFrame(loop);
    else running = false;
  };
  const kick = () => {
    if (running) return;
    running = true;
    requestAnimationFrame(loop);
  };
  return { add: (fn) => { fns.add(fn); kick(); }, kick };
})();
window.addEventListener('scroll', Ticker.kick, { passive: true });
window.addEventListener('resize', Ticker.kick, { passive: true });
window.addEventListener('load', Ticker.kick);

// Polices : on retient les animations du hero jusqu'à ce que la display
// soit chargée (évite un split qui danse pendant le swap). Garde-fou 700 ms.
(function fontsReady() {
  let done = false;
  const ready = () => { if (done) return; done = true; html.classList.add('is-ready'); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(ready);
  setTimeout(ready, 700);
})();

// Enveloppe le contenu d'un titre dans un masque (révélation « rideau »)
function maskWrap(el) {
  if (!el || el.dataset.masked) return;
  el.dataset.masked = '1';
  const inner = document.createElement('span');
  inner.className = 'mask-in';
  while (el.firstChild) inner.appendChild(el.firstChild);
  const mask = document.createElement('span');
  mask.className = 'mask';
  mask.appendChild(inner);
  el.appendChild(mask);
}

// Smooth scroll for in-page links
document.addEventListener('click', function (e) {
  const link = e.target.closest('a[href^="#"]');
  if (!link) return;
  const id = link.getAttribute('href');
  if (id.length > 1) {
    const target = document.querySelector(id);
    if (target) {
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
      window.scrollTo({ top, behavior: PREFERS_REDUCED_MOTION ? 'auto' : 'smooth' });
      if (history.replaceState) history.replaceState(null, '', id);
    }
  }
});

// ------------------------------------------------------------
// Hero cinématique : split lettres orchestré + parallax scroll/souris
// ------------------------------------------------------------
(function heroCinematic() {
  const hero = document.getElementById('hero');
  if (!hero) return;
  const title = hero.querySelector('.hero-title');
  const row = hero.querySelector('.hero-row');
  const hint = hero.querySelector('.hero-scroll');

  if (title && !PREFERS_REDUCED_MOTION) {
    title.setAttribute('aria-label', title.textContent.replace(/\s+/g, ' ').trim());
    let i = 0;
    title.querySelectorAll('.hero-line > span').forEach((word) => {
      const text = word.textContent;
      word.textContent = '';
      word.setAttribute('aria-hidden', 'true');
      Array.from(text).forEach((ch) => {
        const s = document.createElement('span');
        s.className = 'char';
        s.textContent = ch;
        s.style.setProperty('--i', i++);
        word.appendChild(s);
      });
    });
    title.classList.add('is-split');
  }

  if (PREFERS_REDUCED_MOTION) return;

  let cur = 0;            // scroll lissé
  let tx = 0, ty = 0;     // cible souris
  let mx = 0, my = 0;     // souris lissée
  const vh = () => window.innerHeight || 1;

  if (ENHANCED) {
    hero.addEventListener('pointermove', (e) => {
      if (!isDesktop()) return;
      const r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 18;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 12;
      Ticker.kick();
    });
    hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; Ticker.kick(); });
  }

  Ticker.add(() => {
    const target = Math.min(window.scrollY, vh() * 1.2);
    cur = lerp(cur, target, 0.14);
    mx = lerp(mx, tx, 0.08);
    my = lerp(my, ty, 0.08);
    const done = settled(cur, target, 0.1) && settled(mx, tx, 0.05) && settled(my, ty, 0.05);
    if (done) { cur = target; mx = tx; my = ty; }

    const p = clamp01(cur / (vh() * 0.8));
    if (title) {
      title.style.transform = `translate3d(${mx.toFixed(2)}px, ${(my + cur * 0.22).toFixed(2)}px, 0)`;
      title.style.opacity = clamp01(1 - p * 1.15).toFixed(3);
    }
    if (row) {
      row.style.transform = `translate3d(0, ${(cur * 0.1).toFixed(2)}px, 0)`;
      row.style.opacity = clamp01(1 - p * 1.5).toFixed(3);
    }
    if (hint) hint.style.opacity = clamp01(1 - cur / 160).toFixed(3);
    return !done;
  });
})();

// ------------------------------------------------------------
// Barre de lecture : progression lissée + playhead + section en cours
// ------------------------------------------------------------
(function deckBar() {
  const bar = document.querySelector('.deck-progress');
  const progress = bar ? bar.querySelector('span') : null;
  const nowLabel = document.getElementById('deck-now-label');
  const header = document.querySelector('.site-header');
  const sections = Array.from(document.querySelectorAll('main section[id]'));
  const links = Array.from(document.querySelectorAll('.nav-list a[href^="#"]'));

  let head = null;
  if (bar && !PREFERS_REDUCED_MOTION) {
    head = document.createElement('i');
    head.className = 'deck-playhead';
    bar.appendChild(head);
  }

  let cur = 0;
  Ticker.add(() => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const target = max > 0 ? clamp01(window.scrollY / max) : 0;
    cur = PREFERS_REDUCED_MOTION ? target : lerp(cur, target, 0.18);
    if (settled(cur, target, 0.0005)) cur = target;
    if (progress) progress.style.transform = `scaleX(${cur.toFixed(4)})`;
    if (head && bar) head.style.transform = `translate3d(${(cur * bar.clientWidth).toFixed(1)}px, 0, 0)`;
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 8);
    return cur !== target;
  });

  const setLabel = (text) => {
    if (!nowLabel || nowLabel.textContent === text) return;
    nowLabel.textContent = text;
    if (PREFERS_REDUCED_MOTION) return;
    nowLabel.classList.remove('is-flipping');
    void nowLabel.offsetWidth;
    nowLabel.classList.add('is-flipping');
  };

  if (!sections.length || !('IntersectionObserver' in window)) return;
  const aboutAside = document.getElementById('about');
  const observed = aboutAside && aboutAside.tagName !== 'SECTION'
    ? sections.concat(aboutAside)
    : sections;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      setLabel(entry.target.dataset.cue || id);
      links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + id));
    });
  }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
  observed.forEach((s) => io.observe(s));
})();

// Mobile nav toggle
(function mobileNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  const toggle = nav.querySelector('.nav-toggle');
  const list = nav.querySelector('.nav-list');
  if (!toggle || !list) return;

  const setOpen = (open) => {
    list.classList.toggle('open', open);
    document.body.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
  };

  toggle.addEventListener('click', () => setOpen(!list.classList.contains('open')));
  list.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  window.matchMedia('(min-width: 1181px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });
})();

// ------------------------------------------------------------
// Révélations au scroll : masques typo, stagger, variantes (blur/mask/panel)
// ------------------------------------------------------------
(function revealOnScroll() {
  // Pages projet : chaque panneau se révèle indépendamment (pas tout d'un bloc)
  document.querySelectorAll('.page-project .project-sections[data-stagger]').forEach((wrap) => {
    wrap.removeAttribute('data-stagger');
    Array.from(wrap.children).forEach((child) => {
      if (child.classList.contains('project-grid-2')) child.setAttribute('data-stagger', '');
      else child.setAttribute('data-animate', 'panel');
    });
  });

  // Masques « rideau » sur les grands titres
  document.querySelectorAll('.section-head h2, .deck-copy h3, .page-project .project-hero h1').forEach(maskWrap);

  const elements = document.querySelectorAll('[data-animate], [data-stagger]');
  document.querySelectorAll('[data-stagger]').forEach((group) => {
    Array.from(group.children).forEach((child, i) => child.style.setProperty('--i', i));
  });

  if (!('IntersectionObserver' in window) || PREFERS_REDUCED_MOTION) {
    elements.forEach((el) => el.classList.add('in-view'));
    return;
  }
  const io = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        // Verrouille l'état visible après l'anim (évite le retour à opacity:0)
        const lock = () => entry.target.classList.add('is-revealed');
        entry.target.addEventListener('animationend', lock, { once: true });
        setTimeout(lock, 1200);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
  elements.forEach((el) => io.observe(el));
})();

// ------------------------------------------------------------
// Parcours : timeline verticale — playhead qui descend au scroll
// ------------------------------------------------------------
(function parcoursPlayhead() {
  const section = document.getElementById('parcours');
  const wrap = document.querySelector('.track-wrap');
  const rail = document.querySelector('.track-rail');
  const railFill = document.querySelector('.track-rail > span');
  const items = Array.from(document.querySelectorAll('.track-item'));
  if (!section || !wrap || !items.length) return;

  if (PREFERS_REDUCED_MOTION) {
    if (railFill) railFill.style.transform = 'scaleY(1)';
    items.forEach((item) => item.classList.add('is-passed'));
    return;
  }

  const head = document.createElement('div');
  head.className = 'track-playhead';
  head.setAttribute('aria-hidden', 'true');
  wrap.appendChild(head);

  let cur = 0;
  Ticker.add(() => {
    const wrapRect = wrap.getBoundingClientRect();
    const railRect = rail ? rail.getBoundingClientRect() : wrapRect;
    const view = window.innerHeight || 1;
    // La piste se lit quand elle traverse le milieu haut de l'écran
    const start = view * 0.62;
    const end = view * 0.28;
    const target = clamp01((start - wrapRect.top) / (start - end + wrapRect.height));
    cur = lerp(cur, target, 0.12);
    if (settled(cur, target, 0.0008)) cur = target;

    const travel = Math.max(railRect.height - 8, 0);
    if (railFill) railFill.style.transform = `scaleY(${cur.toFixed(4)})`;
    head.style.transform = `translate3d(0, ${(cur * travel).toFixed(1)}px, 0)`;
    head.classList.toggle('is-live', cur > 0.01 && cur < 0.995);
    section.classList.toggle('is-tracking', cur > 0.02 && cur < 0.98);

    // Étape active = celle dont le centre est le plus proche du playhead
    const headY = railRect.top + cur * travel + 8;
    let activeIndex = 0;
    let best = Infinity;
    items.forEach((item, i) => {
      const r = item.getBoundingClientRect();
      const mid = r.top + Math.min(28, r.height * 0.25);
      const dist = Math.abs(mid - headY);
      if (dist < best) { best = dist; activeIndex = i; }
    });

    items.forEach((item, i) => {
      item.classList.toggle('is-active', i === activeIndex && cur > 0.02 && cur < 0.995);
      item.classList.toggle('is-passed', i < activeIndex || cur >= 0.995);
    });
    return cur !== target;
  });
})();

// ------------------------------------------------------------
// Portrait : zoom ciné sur le visage, piloté par le scroll
// ------------------------------------------------------------
(function avatarScrollCue() {
  const avatar = document.querySelector('.profile-avatar');
  const disc = avatar ? avatar.querySelector('.profile-avatar-disc') : null;
  const img = disc ? disc.querySelector('img') : null;
  const frame = avatar ? avatar.querySelector('.profile-avatar-frame') : null;
  const band = document.getElementById('parcours');
  if (!avatar || !disc || !img || !band) return;

  if (PREFERS_REDUCED_MOTION) return;

  let cur = 0;
  Ticker.add(() => {
    const rect = band.getBoundingClientRect();
    const view = window.innerHeight || 1;
    const start = view * 0.78;
    const span = Math.max(rect.height - view * 0.35, view * 0.5);
    const target = clamp01((start - rect.top) / span);
    cur = lerp(cur, target, 0.14);
    if (settled(cur, target, 0.0008)) cur = target;

    // Courbe en cloche : zoom max au milieu du parcours
    const focus = Math.sin(cur * Math.PI);
    const zoom = 1 + focus * 0.28;
    const lift = focus * -6;
    img.style.transform = `scale(${zoom.toFixed(4)}) translateY(${lift.toFixed(2)}px)`;

    // Léger “push” du cadre
    const push = 1 + focus * 0.03;
    disc.style.transform = `scale(${push.toFixed(4)})`;

    if (frame) {
      const mid = cur > 0.55;
      frame.style.outlineColor = mid
        ? 'color-mix(in srgb, var(--low) 55%, transparent)'
        : 'color-mix(in srgb, var(--mid) 50%, transparent)';
    }

    avatar.classList.toggle('is-live', cur > 0.04 && cur < 0.96);
    return cur !== target;
  });
})();

// ------------------------------------------------------------
// Expériences : expérience active (highlight cinéma) + ligne de
// progression verticale sur les étapes (lerp)
// ------------------------------------------------------------
(function experiencesFollow() {
  const section = document.getElementById('experiences');
  const cards = Array.from(document.querySelectorAll('#experiences .xp'));
  if (!section || !cards.length) return;

  const meters = new Map();
  cards.forEach((card) => {
    const steps = card.querySelector('.steps');
    if (!steps) return;
    const m = document.createElement('span');
    m.className = 'steps-progress';
    m.setAttribute('aria-hidden', 'true');
    steps.appendChild(m);
    meters.set(card, { steps, m, cur: 0 });
  });

  if (PREFERS_REDUCED_MOTION) {
    cards.forEach((card) => {
      card.classList.add('is-active');
      card.querySelectorAll('.steps li').forEach((step) => step.classList.add('is-step-done'));
    });
    meters.forEach(({ m }) => { m.style.transform = 'scaleY(1)'; });
    return;
  }

  Ticker.add(() => {
    const vh = window.innerHeight || 1;
    const focusY = vh * 0.42;
    let best = null;
    let bestDist = Infinity;
    let busy = false;

    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const mid = rect.top + rect.height * 0.35;
      const dist = Math.abs(mid - focusY);
      const visible = rect.bottom > 80 && rect.top < vh - 40;
      if (visible && dist < bestDist) { bestDist = dist; best = card; }
    });
    section.classList.toggle('is-tracking', !!best);

    cards.forEach((card) => {
      const active = card === best;
      card.classList.toggle('is-active', active);
      const meter = meters.get(card);
      if (!meter) return;
      const steps = meter.steps.querySelectorAll('li');
      if (!steps.length) return;

      const r = meter.steps.getBoundingClientRect();
      // Active : suit la ligne de focus. Passée : pleine. À venir : vide.
      const target = active ? clamp01((focusY - r.top) / Math.max(r.height, 1)) : (r.top < focusY ? 1 : 0);
      meter.cur = lerp(meter.cur, target, 0.12);
      if (settled(meter.cur, target, 0.002)) meter.cur = target; else busy = true;
      meter.m.style.transform = `scaleY(${meter.cur.toFixed(4)})`;

      const full = meter.cur >= 0.999;
      const idx = Math.min(steps.length - 1, Math.floor(meter.cur * steps.length));
      steps.forEach((step, i) => {
        step.classList.toggle('is-step-done', full || i < idx);
        step.classList.toggle('is-step-active', active && !full && i === idx);
      });
    });
    return busy;
  });
})();

// ------------------------------------------------------------
// Decks (CueMind / BB-Rank) : parallax du mockup + glissement de la grille
// ------------------------------------------------------------
(function deckParallax() {
  if (PREFERS_REDUCED_MOTION) return;
  const decks = Array.from(document.querySelectorAll('.deck'));
  if (!decks.length) return;
  const state = decks.map((deck) => ({ deck, visual: deck.querySelector('.deck-visual'), cur: 0.5 }));

  Ticker.add(() => {
    let busy = false;
    const vh = window.innerHeight || 1;
    state.forEach((s) => {
      const r = s.deck.getBoundingClientRect();
      if (r.bottom < -120 || r.top > vh + 120) return;
      const target = clamp01((vh - r.top) / (vh + r.height));
      s.cur = lerp(s.cur, target, 0.12);
      if (settled(s.cur, target, 0.0008)) s.cur = target; else busy = true;
      s.deck.style.setProperty('--deck-shift', `${(s.cur * -144).toFixed(2)}px`);
      if (s.visual) s.visual.style.transform = isDesktop() ? `translate3d(0, ${((s.cur - 0.5) * -56).toFixed(2)}px, 0)` : '';
    });
    return busy;
  });
})();

// ------------------------------------------------------------
// Boutons magnétiques (desktop + souris uniquement)
// ------------------------------------------------------------
(function magneticButtons() {
  if (!ENHANCED) return;
  const els = document.querySelectorAll('.hero-actions .btn, .header-cta, .hero-socials a, .back-to-top, .project-actions .btn, .deck .btn');
  els.forEach((el) => {
    let tx = 0, ty = 0, x = 0, y = 0, hover = false;
    const strength = el.classList.contains('btn') ? 0.3 : 0.4;

    el.addEventListener('pointerenter', () => { hover = isDesktop(); });
    el.addEventListener('pointermove', (e) => {
      if (!hover) return;
      const r = el.getBoundingClientRect();
      tx = (e.clientX - (r.left + r.width / 2)) * strength;
      ty = (e.clientY - (r.top + r.height / 2)) * strength - 2;
      Ticker.kick();
    });
    el.addEventListener('pointerleave', () => { hover = false; tx = 0; ty = 0; Ticker.kick(); });

    Ticker.add(() => {
      x = lerp(x, tx, 0.18);
      y = lerp(y, ty, 0.18);
      if (settled(x, tx, 0.05) && settled(y, ty, 0.05)) { x = tx; y = ty; }
      if (x === 0 && y === 0) { el.style.transform = ''; return false; }
      el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      return x !== tx || y !== ty;
    });
  });
})();

// Cartes projet : halo qui suit le pointeur (desktop)
(function cardSpotlight() {
  if (!ENHANCED) return;
  const grid = document.querySelector('.projects-grid');
  if (!grid) return;
  grid.addEventListener('pointermove', (e) => {
    const card = e.target.closest('.project.card');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${((e.clientX - r.left) / r.width * 100).toFixed(1)}%`);
    card.style.setProperty('--my', `${((e.clientY - r.top) / r.height * 100).toFixed(1)}%`);
  }, { passive: true });
})();

// Smooth FAQ open/close
(function smoothFaqToggle() {
  const detailsList = Array.from(document.querySelectorAll('details.faq-item'));
  if (!detailsList.length) return;
  if (PREFERS_REDUCED_MOTION) return; // keep instant for reduced-motion users

  detailsList.forEach((details) => {
    const summary = details.querySelector('summary');
    const answer = details.querySelector('.answer');
    if (!summary || !answer) return;

    answer.style.overflow = 'hidden';

    const animateOpen = () => {
      details.setAttribute('open', 'true');
      answer.style.maxHeight = '0px';
      answer.style.paddingBottom = '0px';
      requestAnimationFrame(() => {
        const target = answer.scrollHeight + 20;
        answer.style.transition = 'max-height 450ms cubic-bezier(.2,.7,.1,1), padding 450ms cubic-bezier(.2,.7,.1,1), opacity 380ms cubic-bezier(.2,.7,.1,1)';
        answer.style.maxHeight = target + 'px';
        answer.style.paddingBottom = '20px';
        answer.style.opacity = '1';
      });
    };

    const animateClose = () => {
      const current = answer.scrollHeight;
      answer.style.maxHeight = current + 'px';
      requestAnimationFrame(() => {
        answer.style.transition = 'max-height 420ms cubic-bezier(.2,.7,.1,1), padding 420ms cubic-bezier(.2,.7,.1,1), opacity 320ms cubic-bezier(.2,.7,.1,1)';
        answer.style.maxHeight = '0px';
        answer.style.paddingBottom = '0px';
        answer.style.opacity = '0';
      });

      const onEnd = (e) => {
        if (e.propertyName === 'max-height') {
          details.removeAttribute('open');
          answer.removeEventListener('transitionend', onEnd);
          answer.style.removeProperty('transition');
          answer.style.removeProperty('max-height');
          answer.style.removeProperty('padding-bottom');
          answer.style.removeProperty('opacity');
        }
      };
      answer.addEventListener('transitionend', onEnd);
    };

    summary.addEventListener('click', (e) => {
      e.preventDefault();
      if (details.hasAttribute('open')) animateClose();
      else animateOpen();
    });
  });
})();

// Footer year
(function footerYear() {
  const el = document.getElementById('year');
  if (el) el.textContent = new Date().getFullYear();
})();

// Back to top behavior
(function backToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (PREFERS_REDUCED_MOTION) window.scrollTo(0, 0);
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

// Contact form validation + mailto
(function formHandler() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const showError = (field, message) => {
    const small = field.parentElement.querySelector('.error');
    if (small) small.textContent = message || '';
    field.setAttribute('aria-invalid', message ? 'true' : 'false');
  };

  const validateEmail = (value) => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(value);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.name;
    const email = form.email;
    const reason = form.reason;
    const message = form.message;
    let ok = true;

    if (!name.value.trim()) { showError(name, 'Veuillez renseigner votre nom.'); ok = false; } else { showError(name, ''); }
    if (!validateEmail(email.value)) { showError(email, 'Email invalide.'); ok = false; } else { showError(email, ''); }
    if (!message.value.trim()) { showError(message, 'Veuillez écrire un message.'); ok = false; } else { showError(message, ''); }

    if (!ok) return;

    const to = 'kortogrind@gmail.com';
    let subjectPrefix = 'Contact Portfolio';
    if (reason && reason.value === 'emploi') subjectPrefix = 'Candidature emploi — Portfolio';
    else if (reason && reason.value === 'alternance') subjectPrefix = 'Candidature alternance — Portfolio';
    else if (reason && reason.value === 'freelance') subjectPrefix = 'Mission freelance — Portfolio';

    const subject = `${subjectPrefix} — ${name.value.trim()}`;

    let intro = '';
    if (reason && reason.value === 'emploi') {
      intro = `Bonjour,\n\nJe vous contacte au sujet d'une opportunité d'emploi.`;
    } else if (reason && reason.value === 'alternance') {
      intro = `Bonjour,\n\nJe vous contacte pour une demande d'alternance.`;
    } else if (reason && reason.value === 'freelance') {
      intro = `Bonjour,\n\nJe vous contacte pour une mission freelance.`;
    } else {
      intro = `Bonjour,`;
    }

    const body = `${intro}\n\nNom: ${name.value.trim()}\nEmail: ${email.value.trim()}\n\nMessage:\n${message.value.trim()}`;
    const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.location.href = mailto;
  });
})();

// Consistent colors for identical tech tags (pages projet / cartes non thémées)
(function colorizeProjectTechTags() {
  const tags = document.querySelectorAll('.project-tech span');
  if (!tags.length) return;

  const palette = [
    ['rgba(43,92,255,.10)', 'rgba(43,92,255,.35)', '#1f45c7'],   // bleu — web
    ['rgba(255,122,26,.12)', 'rgba(255,122,26,.40)', '#b4500a'], // orange — langages
    ['rgba(15,19,22,.06)', 'rgba(15,19,22,.30)', '#0f1316'],     // encre — frameworks
    ['rgba(22,163,74,.10)', 'rgba(22,163,74,.35)', '#15803d'],   // vert — data
    ['rgba(124,58,237,.10)', 'rgba(124,58,237,.35)', '#6d28d9'], // violet — infra
    ['rgba(220,38,38,.10)', 'rgba(220,38,38,.35)', '#b91c1c']    // rouge — divers
  ];

  const explicitMap = {
    html: 0,
    css: 0,
    javascript: 0,
    'vue 3': 2,
    vue: 2,
    flutter: 2,
    dart: 2,
    'next.js': 2,
    react: 2,
    typescript: 2,
    ia: 1,
    php: 1,
    python: 1,
    postgresql: 3,
    supabase: 3,
    stripe: 3,
    odoo: 4,
    linux: 4,
    'api rest': 4,
    api: 4
  };

  const colorIndexByLabel = new Map();
  let nextIndex = 0;

  tags.forEach((tag) => {
    if (tag.closest('.project-card-theme, .section-cuemind, .section-bbrank, .deck, .featured-project')) return;

    const raw = tag.textContent ? tag.textContent.trim() : '';
    const key = raw.toLowerCase();
    if (!raw) return;

    if (!colorIndexByLabel.has(key)) {
      const mapped = explicitMap[key];
      colorIndexByLabel.set(key, Number.isInteger(mapped) ? mapped : (nextIndex++ % palette.length));
    }

    const [bg, border, text] = palette[colorIndexByLabel.get(key)];
    tag.style.setProperty('--tech-bg', bg);
    tag.style.setProperty('--tech-border', border);
    tag.style.setProperty('--tech-text', text);
  });
})();

// Pages projet : cue label (titre du projet dans la barre de lecture)
(function projectPageCue() {
  if (!document.body.classList.contains('page-project')) return;
  const nowLabel = document.getElementById('deck-now-label');
  const title = document.querySelector('.project-hero h1');
  if (nowLabel && title) {
    const text = title.textContent.replace(/\s+/g, ' ').trim();
    nowLabel.textContent = text.length > 28 ? text.slice(0, 26) + '…' : text;
  }
})();
