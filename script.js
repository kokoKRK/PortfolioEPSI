// Smooth scroll for in-page links
document.addEventListener('click', function (e) {
  const link = e.target.closest('a[href^="#"]');
  if (!link) return;
  const id = link.getAttribute('href');
  if (id.length > 1) {
    const target = document.querySelector(id);
    if (target) {
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 64; // header height
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }
});

// Mobile nav toggle
(function mobileNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  const toggle = nav.querySelector('.nav-toggle');
  const list = nav.querySelector('.nav-list');
  if (!toggle || !list) return;
  toggle.addEventListener('click', () => {
    const open = list.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  list.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (a) {
      list.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
})();

// Reveal on scroll
(function revealOnScroll() {
  const elements = document.querySelectorAll('[data-animate]');
  if (!('IntersectionObserver' in window)) {
    elements.forEach(el => el.classList.add('in-view'));
    return;
  }
  const io = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  elements.forEach(el => io.observe(el));
})();

// Smooth FAQ open/close
(function smoothFaqToggle() {
  const detailsList = Array.from(document.querySelectorAll('details.faq-item'));
  if (!detailsList.length) return;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return; // keep instant for reduced-motion users

  detailsList.forEach((details) => {
    const summary = details.querySelector('summary');
    const answer = details.querySelector('.answer');
    if (!summary || !answer) return;

    // Ensure no leftover inline styles block native layout
    answer.style.overflow = 'hidden';

    const animateOpen = () => {
      details.setAttribute('open', 'true');
      answer.style.maxHeight = '0px';
      answer.style.paddingBottom = '0px';
      // Wait for next frame to measure
      requestAnimationFrame(() => {
        const target = answer.scrollHeight;
        answer.style.transition = 'max-height 450ms cubic-bezier(.22,.61,.36,1), padding 450ms cubic-bezier(.22,.61,.36,1), opacity 380ms cubic-bezier(.22,.61,.36,1)';
        answer.style.maxHeight = target + 'px';
        answer.style.paddingBottom = '16px';
        answer.style.opacity = '1';
      });
    };

    const animateClose = () => {
      const current = answer.scrollHeight;
      answer.style.maxHeight = current + 'px';
      requestAnimationFrame(() => {
        answer.style.transition = 'max-height 420ms cubic-bezier(.22,.61,.36,1), padding 420ms cubic-bezier(.22,.61,.36,1), opacity 320ms cubic-bezier(.22,.61,.36,1)';
        answer.style.maxHeight = '0px';
        answer.style.paddingBottom = '0px';
        answer.style.opacity = '0';
      });

      const onEnd = (e) => {
        if (e.propertyName === 'max-height') {
          details.removeAttribute('open');
          answer.removeEventListener('transitionend', onEnd);
          // Cleanup inline styles to allow reflow
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
      const isOpen = details.hasAttribute('open');
      if (isOpen) {
        animateClose();
      } else {
        animateOpen();
      }
    });
  });
})();

// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

// Back to top behavior
(function backToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  btn.addEventListener('click', () => {
    if (prefersReduced) {
      window.scrollTo(0, 0);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
})();

// Contact form validation + toast demo
(function formHandler() {
  const form = document.getElementById('contact-form');
  const toast = document.getElementById('toast');
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

    // Try opening the user's email client with prefilled data
    window.location.href = mailto;
  });
})();

// Consistent colors for identical tech tags
(function colorizeProjectTechTags() {
  const tags = document.querySelectorAll('.project-tech span');
  if (!tags.length) return;

  const palette = [
    ['rgba(8,182,212,.12)', 'rgba(8,182,212,.30)', '#0e7490'],
    ['rgba(34,197,94,.12)', 'rgba(34,197,94,.30)', '#166534'],
    ['rgba(139,92,246,.12)', 'rgba(139,92,246,.30)', '#6d28d9'],
    ['rgba(245,158,11,.12)', 'rgba(245,158,11,.35)', '#92400e'],
    ['rgba(236,72,153,.12)', 'rgba(236,72,153,.30)', '#9d174d'],
    ['rgba(59,130,246,.12)', 'rgba(59,130,246,.30)', '#1d4ed8']
  ];

  const explicitMap = {
    html: 0,
    css: 0,
    javascript: 0,
    'vue 3': 1,
    vue: 1,
    flutter: 2,
    dart: 2,
    'next.js': 2,
    react: 2,
    typescript: 2,
    ia: 3,
    php: 3,
    python: 3,
    postgresql: 4,
    supabase: 4,
    stripe: 4,
    odoo: 5,
    linux: 5,
    'api rest': 5,
    api: 5
  };

  const colorIndexByLabel = new Map();
  let nextIndex = 0;

  tags.forEach((tag) => {
    if (tag.closest('.project-card-theme, .section-cuemind, .section-bbrank, .featured-project')) return;

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

// Reorder sections to match navigation
(function reorderSections() {
  const projects = document.getElementById('projects');
  const btsProject = document.getElementById('bts-project');
  const experiences = document.getElementById('experiences');
  const skills = document.getElementById('skills');
  const veille = document.getElementById('veille');
  const tools = document.getElementById('tools');
  const contact = document.getElementById('contact');

  // Ordre : projets réalisés → projet BTS → expériences
  if (projects && btsProject && btsProject.previousElementSibling !== projects) {
    projects.parentNode.insertBefore(btsProject, projects.nextElementSibling);
  }
  if (projects && experiences) {
    const anchor = btsProject || projects;
    if (experiences.previousElementSibling !== anchor) {
      anchor.parentNode.insertBefore(experiences, anchor.nextElementSibling);
    }
  }
  if (tools && skills && veille) {
    tools.parentNode.insertBefore(skills, tools);
    tools.parentNode.insertBefore(veille, tools);
  }
  if (contact && tools) {
    contact.parentNode.insertBefore(tools, contact);
  }
})();


