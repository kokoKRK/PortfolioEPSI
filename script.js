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
    if (reason && reason.value === 'alternance') subjectPrefix = 'Candidature alternance — Portfolio';
    else if (reason && reason.value === 'stage') subjectPrefix = 'Candidature stage — Portfolio';

    const subject = `${subjectPrefix} — ${name.value.trim()}`;

    let intro = '';
    if (reason && reason.value === 'alternance') {
      intro = `Bonjour,\n\nJe vous contacte pour une demande d'alternance.`;
    } else if (reason && reason.value === 'stage') {
      intro = `Bonjour,\n\nJe vous contacte pour une demande de stage.`;
    } else {
      intro = `Bonjour,`;
    }

    const body = `${intro}\n\nNom: ${name.value.trim()}\nEmail: ${email.value.trim()}\n\nMessage:\n${message.value.trim()}`;
    const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    // Try opening the user's email client with prefilled data
    window.location.href = mailto;
  });
})();


