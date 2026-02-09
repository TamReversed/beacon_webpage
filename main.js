/**
 * Beacon — Main frontend behavior
 * Navbar scroll, scroll-driven background animations, scroll-triggered reveals,
 * uptime bars, interactive demo, FAQ, smooth scroll
 */

(function () {
  'use strict';

  // --- Navbar scroll state ---
  const nav = document.getElementById('navbar');
  if (nav) {
    const onScroll = function () {
      if (window.scrollY > 50) {
        nav.classList.add('is-scrolled');
      } else {
        nav.classList.remove('is-scrolled');
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // set initial state
  }

  // --- Mobile nav drawer (hamburger open/close, scroll lock, backdrop) ---
  (function () {
    var hamburger = document.querySelector('.nav .hamburger');
    var panel = document.getElementById('nav-panel');
    if (!hamburger || !panel) return;

    function isOpen() { return document.body.classList.contains('nav-open'); }
    function close() {
      document.body.classList.remove('nav-open');
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.setAttribute('aria-label', 'Open menu');
      var backdrop = document.querySelector('.nav-backdrop');
      if (backdrop) backdrop.remove();
    }
    function open() {
      document.body.classList.add('nav-open');
      hamburger.setAttribute('aria-expanded', 'true');
      hamburger.setAttribute('aria-label', 'Close menu');
      var backdrop = document.createElement('div');
      backdrop.className = 'nav-backdrop';
      backdrop.setAttribute('aria-hidden', 'true');
      backdrop.addEventListener('click', close);
      document.body.appendChild(backdrop);
    }

    hamburger.addEventListener('click', function () {
      if (isOpen()) close(); else open();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) close();
    });
    panel.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', close);
    });
  })();

  // --- Scroll-driven background animations (hero mesh/grid/orbs, final CTA orbs) + content parallax ---
  (function () {
    var heroMesh = document.getElementById('hero-mesh');
    var heroGrid = document.getElementById('hero-grid');
    var heroOrbs = document.querySelectorAll('.hero-orb');
    var finalOrbs = document.querySelectorAll('.final-cta-orb');
    var hero = document.querySelector('.hero');
    var finalCta = document.querySelector('.final-cta');
    var heroContent = document.querySelector('.hero-content');
    var heroVisual = document.querySelector('.hero-visual');
    var parallaxLayers = document.querySelectorAll('.parallax-depth-layer');
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function getHeroProgress() {
      if (!hero) return 0;
      var rect = hero.getBoundingClientRect();
      if (rect.top >= 0) return 0;
      if (rect.top <= -rect.height) return 1;
      return -rect.top / rect.height;
    }

    function getFinalCtaProgress() {
      if (!finalCta) return 0;
      var rect = finalCta.getBoundingClientRect();
      var trigger = window.innerHeight * 0.7;
      if (rect.top > trigger) return 0;
      if (rect.bottom < 0) return 1;
      return Math.min(1, (trigger - rect.top) / (rect.height * 0.5 + trigger));
    }

    function updateScrollBg() {
      var y = window.scrollY;
      var heroProgress = getHeroProgress();
      var finalProgress = getFinalCtaProgress();

      if (heroMesh) {
        var meshMoveY = -y * 0.32;
        var meshScale = 1 + heroProgress * 0.15;
        var meshOpacity = 1 - heroProgress * 0.85;
        heroMesh.style.transform = 'translate(-50%, calc(-50% + ' + meshMoveY + 'px)) scale(' + meshScale + ')';
        heroMesh.style.opacity = Math.max(0.08, meshOpacity);
      }

      if (heroGrid) {
        var gridMoveY = -y * 0.55;
        var gridSkew = Math.sin(heroProgress * Math.PI) * 1.5;
        var gridOpacity = 0.9 - heroProgress * 0.88;
        heroGrid.style.transform = 'translateY(' + gridMoveY + 'px) skewY(' + gridSkew + 'deg)';
        heroGrid.style.opacity = Math.max(0.02, gridOpacity);
      }

      heroOrbs.forEach(function (orb) {
        if (y < 20 && heroProgress < 0.05) {
          orb.style.transform = '';
          orb.style.opacity = '';
          return;
        }
        var speed = parseFloat(orb.getAttribute('data-speed')) || 0.2;
        var moveY = -y * speed * 0.75;
        var scale = 1 - heroProgress * 0.45;
        var opacity = 0.6 - heroProgress * 0.55;
        orb.style.transform = 'translateY(' + moveY + 'px) scale(' + scale + ')';
        orb.style.opacity = Math.max(0.04, opacity);
      });

      finalOrbs.forEach(function (orb) {
        var speed = parseFloat(orb.getAttribute('data-speed')) || 0.2;
        var moveY = (1 - finalProgress) * 100 * speed;
        var scale = 0.65 + finalProgress * 0.4;
        var opacity = 0.15 + finalProgress * 0.42;
        orb.style.transform = 'translateY(' + moveY + 'px) scale(' + scale + ')';
        orb.style.opacity = Math.min(0.58, opacity);
      });

      if (!reduceMotion) {
        if (heroContent) heroContent.style.transform = 'translateY(' + (y * 0.08) + 'px)';
        if (heroVisual) heroVisual.style.transform = 'translateY(' + (y * 0.12) + 'px)';
        parallaxLayers.forEach(function (layer, i) {
          var rate = i === 0 ? 0.06 : 0.12;
          layer.style.transform = 'translateY(' + (y * rate) + 'px)';
        });
      } else {
        if (heroContent) heroContent.style.transform = '';
        if (heroVisual) heroVisual.style.transform = '';
        parallaxLayers.forEach(function (layer) { layer.style.transform = ''; });
      }
    }

    var ticking = false;
    function onScrollTick() {
      updateScrollBg();
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(onScrollTick);
        ticking = true;
      }
    }, { passive: true });
    updateScrollBg();
  })();

  // --- Scroll-triggered animations (Intersection Observer) with stagger ---
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  const revealEls = document.querySelectorAll('.animate-on-scroll');
  const staggerMs = 55;
  const maxStaggerMs = 330;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      if (el.classList.contains('visible')) return;
      var idx = parseInt(el.dataset.revealIndex, 10) || 0;
      el.style.transitionDelay = prefersReducedMotion ? '0ms' : (Math.min(idx * staggerMs, maxStaggerMs) + 'ms');
      el.classList.add('visible');
    });
  }, observerOptions);

  revealEls.forEach(function (el, i) {
    el.dataset.revealIndex = String(i);
    observer.observe(el);
  });

  // --- Final CTA content entrance ---
  var finalCtaContent = document.querySelector('.final-cta-content');
  if (finalCtaContent) {
    var ctaObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) entry.target.classList.add('final-cta-visible');
      });
    }, { threshold: 0.2 });
    ctaObserver.observe(finalCtaContent);
  }

  // --- Hero uptime bars ---
  function generateUptimeBars(containerId, count) {
    const container = document.getElementById(containerId);
    if (!container) return;

    for (let i = 0; i < count; i++) {
      const bar = document.createElement('div');
      bar.className = 'uptime-bar';
      const randomHeight = Math.random() > 0.95 ? Math.random() * 0.3 + 0.7 : 1;
      bar.style.height = (randomHeight * 100) + '%';
      if (randomHeight < 0.95) {
        bar.style.background = 'var(--color-yellow)';
      }
      container.appendChild(bar);
    }
  }

  generateUptimeBars('hero-uptime', 90);

  // --- Interactive demo: component status toggles ---
  const componentStates = {
    api: 'operational',
    auth: 'operational',
    db: 'operational'
  };

  const stateOrder = ['operational', 'degraded', 'outage'];
  const stateLabels = {
    operational: 'Operational',
    degraded: 'Degraded Performance',
    outage: 'Major Outage'
  };
  const stateColors = {
    operational: 'var(--color-green)',
    degraded: 'var(--color-yellow)',
    outage: 'var(--color-red)'
  };

  function updateDemoStatus() {
    const states = Object.values(componentStates);
    const hasOutage = states.includes('outage');
    const hasDegraded = states.includes('degraded');

    const statusText = document.getElementById('demo-status-text');
    const statusDot = document.getElementById('demo-main-dot');
    const header = document.getElementById('demo-header');

    if (!statusText || !statusDot || !header) return;

    if (hasOutage) {
      statusText.textContent = 'Major System Outage';
      statusDot.style.background = stateColors.outage;
      header.style.background = 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)';
    } else if (hasDegraded) {
      statusText.textContent = 'Partial System Outage';
      statusDot.style.background = stateColors.degraded;
      header.style.background = 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)';
    } else {
      statusText.textContent = 'All Systems Operational';
      statusDot.style.background = stateColors.operational;
      header.style.background = 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)';
    }
  }

  function toggleComponentStatus(componentEl) {
    const componentId = componentEl.dataset.component;
    if (!componentId || !componentStates.hasOwnProperty(componentId)) return;

    const currentState = componentStates[componentId];
    const currentIndex = stateOrder.indexOf(currentState);
    const nextIndex = (currentIndex + 1) % stateOrder.length;
    const nextState = stateOrder[nextIndex];

    componentStates[componentId] = nextState;

    const statusEl = componentEl.querySelector('.component-status');
    if (!statusEl) return;

    statusEl.className = 'component-status ' + nextState;
    statusEl.textContent = '';

    const newDot = document.createElement('span');
    newDot.className = 'status-dot-small';
    statusEl.appendChild(newDot);
    statusEl.appendChild(document.createTextNode(stateLabels[nextState]));

    updateDemoStatus();
  }

  document.querySelectorAll('.interactive-component').forEach(function (component) {
    component.addEventListener('click', function () {
      toggleComponentStatus(component);
    });
    component.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleComponentStatus(component);
      }
    });
  });

  // --- FAQ accordion ---
  document.querySelectorAll('.faq-question').forEach(function (button) {
    button.addEventListener('click', function () {
      const faqItem = button.closest('.faq-item');
      if (!faqItem) return;

      const isOpen = faqItem.classList.contains('is-open');

      document.querySelectorAll('.faq-item').forEach(function (item) {
        item.classList.remove('is-open');
        const q = item.querySelector('.faq-question');
        if (q) q.setAttribute('aria-expanded', 'false');
      });

      if (!isOpen) {
        faqItem.classList.add('is-open');
        button.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // --- Smooth scroll for in-page anchors ---
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#' || href.length <= 1) return;
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

  // --- Feature card 3D tilt on hover (respects reduced-motion) ---
  var tiltCards = document.querySelectorAll('.feature-card');
  var reduceMotionTilt = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var maxTilt = 3;
  tiltCards.forEach(function (card) {
    card.addEventListener('mouseenter', function () {
      if (reduceMotionTilt) return;
      card.classList.add('is-tilting');
    });
    card.addEventListener('mousemove', function (e) {
      if (reduceMotionTilt) return;
      var rect = card.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width - 0.5;
      var y = (e.clientY - rect.top) / rect.height - 0.5;
      var rotateY = Math.max(-maxTilt, Math.min(maxTilt, x * maxTilt * 2));
      var rotateX = Math.max(-maxTilt, Math.min(maxTilt, -y * maxTilt * 2));
      card.style.transform = 'perspective(800px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) translateY(-6px)';
      card.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.08)';
      card.style.borderColor = 'var(--color-accent-muted)';
    });
    card.addEventListener('mouseleave', function () {
      if (reduceMotionTilt) return;
      card.classList.remove('is-tilting');
      card.style.transform = '';
      card.style.boxShadow = '';
      card.style.borderColor = '';
    });
  });
})();
