// Shared behaviour for every page.

// Header state and floating WhatsApp button
const header = document.querySelector('.header');
const waFloat = document.querySelector('.wa-float');
const hero = document.querySelector('.hero');
function onScroll() {
  header.classList.toggle('is-scrolled', window.scrollY > 10);
  if (waFloat) {
    const threshold = hero ? hero.offsetHeight * 0.6 : 120;
    waFloat.classList.toggle('is-visible', window.scrollY > threshold);
  }
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Mobile menu and services menu
const toggle = document.getElementById('menuToggle');
const nav = document.getElementById('nav');
const navItem = nav.querySelector('[data-nav-item]');
const caret = nav.querySelector('.nav__caret');

function setServices(open) {
  navItem.classList.toggle('is-open', open);
  caret.setAttribute('aria-expanded', String(open));
}
function setMenu(open) {
  nav.classList.toggle('is-open', open);
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  if (!open) setServices(false);
}
toggle.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
caret.addEventListener('click', () => setServices(!navItem.classList.contains('is-open')));
nav.addEventListener('click', (e) => {
  if (e.target.closest('a')) setMenu(false);
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('.header__pill')) setMenu(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') setMenu(false);
});

// Reveal on scroll, with a soft stagger between neighbours
const items = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries
        .filter((entry) => entry.isIntersecting)
        .forEach((entry, i) => {
          const el = entry.target;
          el.style.transitionDelay = `${Math.min(i, 4) * 90}ms`;
          el.classList.add('is-visible');
          io.unobserve(el);
          // Hand back to each component's own hover transition once revealed.
          window.setTimeout(() => {
            el.classList.add('is-done');
            el.style.transitionDelay = '';
          }, 1400);
        });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
  );
  items.forEach((el) => io.observe(el));
} else {
  items.forEach((el) => el.classList.add('is-visible'));
}

// Patient review carousel
document.querySelectorAll('[data-reviews]').forEach((carousel) => {
  const track = carousel.querySelector('.testimonials');
  const arrows = carousel.querySelectorAll('.t-arrow');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function update() {
    const max = track.scrollWidth - track.clientWidth - 2;
    carousel.classList.toggle('is-static', max <= 0);
    arrows.forEach((button) => {
      button.disabled = button.dataset.dir === '-1' ? track.scrollLeft <= 2 : track.scrollLeft >= max;
    });
  }

  arrows.forEach((button) => {
    button.addEventListener('click', () => {
      const card = track.querySelector('.testimonial');
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      track.scrollBy({ left: (card.getBoundingClientRect().width + gap) * Number(button.dataset.dir), behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    });
  });
  track.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
});

// FAQ accordion
document.querySelectorAll('[data-accordion]').forEach((accordion) => {
  accordion.addEventListener('click', (e) => {
    const button = e.target.closest('.faq__button');
    if (!button) return;
    const willOpen = button.getAttribute('aria-expanded') !== 'true';
    accordion.querySelectorAll('.faq__button').forEach((other) => {
      other.setAttribute('aria-expanded', 'false');
      other.closest('.faq__item').classList.remove('is-open');
    });
    if (willOpen) {
      button.setAttribute('aria-expanded', 'true');
      button.closest('.faq__item').classList.add('is-open');
    }
  });
});

// Booking form to WhatsApp
const form = document.getElementById('bookingForm');
if (form) {
  const errorEl = document.getElementById('formError');
  const consentField = document.getElementById('consentField');
  const guardianField = document.getElementById('guardianField');
  const guardianInput = guardianField.querySelector('input');
  const ageInput = form.elements.age;
  const serviceSelect = form.elements.service;
  const keyTerms = form.querySelector('[data-key-terms]');
  const keyTermsToggle = keyTerms.querySelector('.key-terms__toggle');

  function setKeyTerms(open) {
    keyTerms.classList.toggle('is-open', open);
    keyTermsToggle.setAttribute('aria-expanded', String(open));
  }
  keyTermsToggle.addEventListener('click', () => setKeyTerms(!keyTerms.classList.contains('is-open')));

  const requested = new URLSearchParams(window.location.search).get('service');
  if (requested && [...serviceSelect.options].some((o) => o.value === requested)) {
    serviceSelect.value = requested;
  }

  function syncGuardian() {
    const age = Number(ageInput.value);
    const isMinor = ageInput.value !== '' && age > 0 && age < 18;
    guardianField.hidden = !isMinor;
    guardianInput.disabled = !isMinor;
  }
  ageInput.addEventListener('input', syncGuardian);
  syncGuardian();

  form.addEventListener('input', (e) => {
    const field = e.target.closest('.field, .consent');
    if (field) field.classList.remove('is-invalid');
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    errorEl.textContent = '';
    let firstInvalid = null;

    form.querySelectorAll('.field input, .field select, .field textarea').forEach((input) => {
      if (input.disabled) return;
      input.value = input.value.trim();
      let valid = input.checkValidity();
      if (input.name === 'phone' && input.value) {
        valid = valid && input.value.replace(/\D/g, '').length >= 10;
      }
      input.closest('.field').classList.toggle('is-invalid', !valid);
      if (!valid && !firstInvalid) firstInvalid = input;
    });

    const consent = form.elements.consent;
    consentField.classList.toggle('is-invalid', !consent.checked);
    if (!consent.checked && !firstInvalid) {
      firstInvalid = consent;
      setKeyTerms(true);
    }

    if (firstInvalid) {
      errorEl.textContent =
        firstInvalid === consent
          ? 'Please read and accept the terms to continue.'
          : 'Please fill in all required fields correctly.';
      firstInvalid.focus();
      return;
    }

    const d = new FormData(form);
    const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const lines = [
      'Hello PreVitaZen, I would like to book a consultation.',
      '',
      `*Name:* ${d.get('name')}`,
      `*Service:* ${serviceSelect.selectedOptions[0].text}`,
      `*Age:* ${d.get('age')}`,
    ];
    if (d.get('guardian')) lines.push(`*Parent/Guardian:* ${d.get('guardian')}`);
    lines.push(`*Gender:* ${d.get('gender')}`, `*Contact:* ${d.get('phone')}`);
    if (d.get('email')) lines.push(`*Email:* ${d.get('email')}`);
    lines.push(`*Occupation:* ${d.get('occupation')}`, `*Marital Status:* ${d.get('marital')}`, `*Address:* ${d.get('address')}`);
    if (d.get('reference')) lines.push(`*Reference:* ${d.get('reference')}`);
    lines.push('', `*Terms accepted:* Yes, version ${form.dataset.termsVersion}, on ${today}`);

    const url = `https://wa.me/${form.dataset.whatsapp}?text=${encodeURIComponent(lines.join('\n'))}`;
    window.open(url, '_blank', 'noopener');
  });
}
