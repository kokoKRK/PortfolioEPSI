(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // ── Page Loader ──
  const loader = document.getElementById('pageLoader')
  if (loader) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        loader.classList.add('done')
        document.querySelector('.hero-fullscreen')?.classList.add('loaded')
      }, 1200)
    })
    setTimeout(() => {
      loader.classList.add('done')
      document.querySelector('.hero-fullscreen')?.classList.add('loaded')
    }, 3000)
  }

  // ── Custom Cursor (desktop only) ──
  if (window.matchMedia('(pointer:fine)').matches && !reduced) {
    const dot = document.createElement('div')
    dot.className = 'cursor-dot'
    const ring = document.createElement('div')
    ring.className = 'cursor-ring'
    document.body.appendChild(dot)
    document.body.appendChild(ring)
    document.body.classList.add('custom-cursor')

    let mx = -100, my = -100, rx = -100, ry = -100
    document.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY
      dot.style.left = mx + 'px'
      dot.style.top = my + 'px'
      if (!dot.classList.contains('visible')) {
        dot.classList.add('visible')
        ring.classList.add('visible')
      }
    })

    const ringTick = () => {
      rx += (mx - rx) * 0.15
      ry += (my - ry) * 0.15
      ring.style.left = rx + 'px'
      ring.style.top = ry + 'px'
      requestAnimationFrame(ringTick)
    }
    requestAnimationFrame(ringTick)

    const hoverTargets = 'a,button,input,textarea,select,.category-card,.gallery figure,.marquee-item,.showcase-card,.related-card'
    document.addEventListener('mouseover', e => {
      if (e.target.closest(hoverTargets)) {
        dot.classList.add('hover')
        ring.classList.add('hover')
      }
    })
    document.addEventListener('mouseout', e => {
      if (e.target.closest(hoverTargets)) {
        dot.classList.remove('hover')
        ring.classList.remove('hover')
      }
    })
  }

  // ── Grain Overlay ──
  const grain = document.createElement('div')
  grain.className = 'grain'
  grain.setAttribute('aria-hidden', 'true')
  document.body.appendChild(grain)

  // ── Page Transition ──
  const transition = document.createElement('div')
  transition.className = 'page-transition'
  document.body.appendChild(transition)

  document.addEventListener('click', e => {
    const link = e.target.closest('a[href]')
    if (!link) return
    const href = link.getAttribute('href')
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('http') || link.target === '_blank') return
    e.preventDefault()
    transition.classList.add('active')
    setTimeout(() => { window.location.href = href }, 350)
  })

  window.addEventListener('pageshow', e => {
    if (e.persisted) transition.classList.remove('active')
  })

  // ── Scroll Progress ──
  const progressBar = document.getElementById('scrollProgress')
  if (progressBar) {
    const updateProgress = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight
      progressBar.style.width = h > 0 ? (window.scrollY / h * 100) + '%' : '0%'
    }
    addEventListener('scroll', updateProgress, { passive: true })
  }

  // ── Header ──
  const header = document.getElementById('siteHeader')
  if (header) {
    const isHome = !!document.querySelector('.hero-fullscreen')
    if (!isHome) header.classList.add('scrolled')
    addEventListener('scroll', () => {
      if (isHome) header.classList.toggle('scrolled', window.scrollY > 80)
    }, { passive: true })
  }

  // ── Parallax Hero ──
  const heroBg = document.querySelector('.hero-bg img')
  if (heroBg && !reduced) {
    let ticking = false
    addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrolled = window.scrollY
          if (scrolled < window.innerHeight) {
            heroBg.style.transform = 'scale(' + (1.08 - scrolled * 0.0001) + ') translateY(' + (scrolled * 0.3) + 'px)'
          }
          ticking = false
        })
        ticking = true
      }
    }, { passive: true })
  }

  // ── Mobile Nav ──
  const toggle = document.getElementById('navToggle')
  const navLinks = document.getElementById('navLinks')
  const navOverlay = document.getElementById('navOverlay')
  if (toggle && navLinks) {
    toggle.addEventListener('click', () => {
      const open = navLinks.classList.toggle('open')
      toggle.classList.toggle('active', open)
      toggle.setAttribute('aria-expanded', open)
      navOverlay?.classList.toggle('open', open)
      document.body.style.overflow = open ? 'hidden' : ''
    })
    navOverlay?.addEventListener('click', () => {
      navLinks.classList.remove('open')
      toggle.classList.remove('active')
      toggle.setAttribute('aria-expanded', 'false')
      navOverlay.classList.remove('open')
      document.body.style.overflow = ''
    })
  }

  // ── Back to Top ──
  const btt = document.getElementById('backToTop')
  if (btt) {
    addEventListener('scroll', () => {
      btt.classList.toggle('visible', window.scrollY > 600)
    }, { passive: true })
    btt.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  // ── Scroll Reveal ──
  if (!reduced) {
    const reveals = document.querySelectorAll('.reveal')
    if (reveals.length) {
      const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target) }
        })
      }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' })
      reveals.forEach(el => obs.observe(el))
    }
  } else {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'))
  }

  // ── Counter Animation ──
  const counters = document.querySelectorAll('[data-count]')
  if (counters.length && !reduced) {
    const countObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return
        const el = e.target
        const target = parseInt(el.dataset.count, 10)
        const duration = 1600
        const start = performance.now()
        const tick = now => {
          const progress = Math.min((now - start) / duration, 1)
          const eased = 1 - Math.pow(1 - progress, 3)
          el.textContent = Math.round(target * eased)
          if (progress < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
        countObs.unobserve(el)
      })
    }, { threshold: 0.5 })
    counters.forEach(c => countObs.observe(c))
  } else {
    counters.forEach(c => { c.textContent = c.dataset.count })
  }

  // ── Lightbox with Navigation ──
  const lightbox = document.getElementById('lightbox')
  if (lightbox) {
    const lbImg = lightbox.querySelector('img')
    const lbCaption = lightbox.querySelector('.lightbox-caption')
    const lbClose = lightbox.querySelector('.lightbox-close')
    const lbCounter = lightbox.querySelector('.lightbox-counter')

    let lbItems = []
    let lbIndex = 0

    window.openLightbox = (src, caption, items, index) => {
      lbImg.src = src
      lbImg.alt = caption || ''
      if (lbCaption) lbCaption.textContent = caption || ''
      lightbox.classList.add('open')
      document.body.style.overflow = 'hidden'

      if (items && items.length > 1) {
        lbItems = items
        lbIndex = typeof index === 'number' ? index : 0
        updateLbCounter()
        lightbox.classList.add('has-nav')
      } else {
        lbItems = []
        lightbox.classList.remove('has-nav')
      }
    }

    function updateLbCounter() {
      if (lbCounter) lbCounter.textContent = (lbIndex + 1) + ' / ' + lbItems.length
    }

    function lbNav(dir) {
      if (!lbItems.length) return
      lbIndex = (lbIndex + dir + lbItems.length) % lbItems.length
      const item = lbItems[lbIndex]
      lbImg.src = item.src
      lbImg.alt = item.title || ''
      if (lbCaption) lbCaption.textContent = item.title || ''
      updateLbCounter()
    }

    window.lbNav = lbNav

    const closeLb = () => {
      lightbox.classList.remove('open')
      lightbox.classList.remove('has-nav')
      document.body.style.overflow = ''
      lbItems = []
      setTimeout(() => { lbImg.src = '' }, 400)
    }

    lbClose?.addEventListener('click', e => { e.stopPropagation(); closeLb() })

    const prevBtn = lightbox.querySelector('.lightbox-prev')
    const nextBtn = lightbox.querySelector('.lightbox-next')
    prevBtn?.addEventListener('click', e => { e.stopPropagation(); lbNav(-1) })
    nextBtn?.addEventListener('click', e => { e.stopPropagation(); lbNav(1) })

    lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLb() })
    document.addEventListener('keydown', e => {
      if (!lightbox.classList.contains('open')) return
      if (e.key === 'Escape') closeLb()
      if (e.key === 'ArrowLeft') lbNav(-1)
      if (e.key === 'ArrowRight') lbNav(1)
    })
  }
})()
