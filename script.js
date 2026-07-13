const menuButton = document.querySelector('.menu-button');
const nav = document.querySelector('#site-nav');

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

window.addEventListener('pageshow', () => {
  if (!window.location.hash) {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }
  syncProfileMotion();
});

function syncProfileMotion() {
  const profileCard = document.querySelector('.profile-card');
  const content = document.querySelector('.content');
  if (!profileCard || !content || window.innerWidth <= 1040) {
    document.documentElement.style.setProperty('--profile-dynamic-top', 'auto');
    return;
  }

  const startTop = content.getBoundingClientRect().top + window.scrollY;
  const centerTop = Math.max(18, (window.innerHeight - profileCard.offsetHeight) / 2);
  const progress = Math.min(Math.max(window.scrollY / 320, 0), 1);
  const eased = 1 - Math.pow(1 - progress, 3);
  const currentTop = Math.round(startTop + (centerTop - startTop) * eased);
  document.documentElement.style.setProperty('--profile-dynamic-top', `${currentTop}px`);
}

let profileMotionFrame = 0;
const requestProfileMotion = () => {
  window.cancelAnimationFrame(profileMotionFrame);
  profileMotionFrame = window.requestAnimationFrame(syncProfileMotion);
};

window.addEventListener('scroll', requestProfileMotion, { passive: true });
window.addEventListener('resize', requestProfileMotion);
window.addEventListener('load', requestProfileMotion);
document.fonts?.ready?.then(requestProfileMotion);

menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!open));
  nav.classList.toggle('open', !open);
});
nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open');
  menuButton?.setAttribute('aria-expanded', 'false');
}));

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -7% 0px' });
const animatedTargets = [...document.querySelectorAll('.section, .reveal')];
animatedTargets.forEach((el, index) => {
  if (el.matches('.content .section:first-child')) {
    el.classList.add('visible');
    return;
  }
  el.style.setProperty('--reveal-delay', `${Math.min(index * 28, 140)}ms`);
  observer.observe(el);
});
document.querySelector('#year').textContent = new Date().getFullYear();

document.querySelectorAll('[data-collapsible-list]').forEach(list => {
  const items = Array.from(list.children);
  const button = list.parentElement?.querySelector('[data-show-more]');
  const visibleCount = Number(list.dataset.showCount || 8);
  if (!button || items.length <= visibleCount) {
    button?.remove();
    return;
  }

  items.slice(visibleCount).forEach(item => item.classList.add('is-hidden'));
  const originalText = button.textContent;
  button.addEventListener('click', () => {
    const expanded = list.classList.toggle('is-expanded');
    items.slice(visibleCount).forEach(item => item.classList.toggle('is-hidden', !expanded));
    button.textContent = expanded ? 'Show fewer' : originalText;
  });
});
