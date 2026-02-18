(() => {
  // Compute a relative prefix that works for BOTH:
  // 1) GitHub Pages project path: /<repo>/seasons/s1/index.html
  // 2) Custom domain root path:   /seasons/s1/index.html
  const parts = window.location.pathname.split('/').filter(Boolean);
  const ROOT_DIRS = new Set(['seasons', 'leaderboard', 'assets']);
  const baseIndex = ROOT_DIRS.has((parts[0] || '').toLowerCase()) ? 0 : 1;

  const last = parts[parts.length - 1] || '';
  const hasFile = /\.[a-z0-9]+$/i.test(last);

  const depth = Math.max(
    0,
    hasFile ? (parts.length - baseIndex - 1) : (parts.length - baseIndex)
  );
  const prefix = '../'.repeat(depth);

  const pathLower = window.location.pathname.toLowerCase();

  const isActive = (key) => {
    if (key === 'seasons') {
      return (
        pathLower.includes('/seasons/') ||
        pathLower.endsWith('/index.html') ||
        pathLower.endsWith('/')
      );
    }
    if (key === 'leaderboard') return pathLower.includes('/leaderboard/');
    return false;
  };

  const isIOS = (() => {
    const ua = navigator.userAgent || '';
    const iOSUA = /iPad|iPhone|iPod/.test(ua);
    const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return iOSUA || iPadOS;
  })();

  const header = document.createElement('header');
  header.className = 'mbqTopbar';

  header.innerHTML = `
    <div class="mbqTopbar__inner">
      <div class="mbqTopbar__left">
        <a class="mbqTopbar__brand" href="${prefix}index.html" aria-label="MagicBlock Quiz Home">
          <span class="mbqTopbar__logo" aria-hidden="true">
            <video class="mbqLogoVideo" autoplay muted loop playsinline preload="auto">
              <source src="${prefix}assets/logo.webm" type="video/webm" />
            </video>
            <img class="mbqLogoImg" src="${prefix}assets/faviconlogo/favicon-32x32.png" alt="" />
          </span>
        </a>
      </div>

      <nav class="mbqTopbar__nav" aria-label="Primary">
        <a href="${prefix}index.html" class="${isActive('seasons') ? 'is-active' : ''}">Seasons</a>
        <a href="${prefix}leaderboard/index.html" class="${isActive('leaderboard') ? 'is-active' : ''}">Leaderboard</a>
        <button type="button" id="achievementsBtn">Achievements</button>
      </nav>

      <div class="mbqTopbar__right">
        <button type="button" class="mbqBurger" id="mbqBurgerBtn" aria-label="Open menu" aria-expanded="false">
          <span aria-hidden="true">☰</span>
        </button>

        <button type="button" class="mbqTopbar__profile" id="profilePill" title="Profile">
          <div class="mbqTopbar__avatar"><img alt="" /></div>
          <div class="mbqTopbar__ptext">
            <div class="mbqTopbar__pname" data-profile-name>Player</div>
            <div class="mbqTopbar__pedit" data-profile-hint>Edit</div>
          </div>
        </button>
      </div>
    </div>

    <div class="mbqMenuOverlay" id="mbqMenuOverlay" hidden></div>

    <aside class="mbqMenu" id="mbqMenu" hidden aria-label="Menu">
      <div class="mbqMenu__head">
        <div class="mbqMenu__title">Menu</div>
        <button class="mbqMenu__close" id="mbqMenuClose" aria-label="Close menu">✕</button>
      </div>

      <a class="mbqMenu__item" href="${prefix}index.html">Seasons</a>
      <a class="mbqMenu__item" href="${prefix}leaderboard/index.html">Leaderboard</a>
      <button class="mbqMenu__item" type="button" id="mbqMenuAchievements">Achievements</button>
    </aside>
  `;

  function safeJSON(v, fallback = null) {
    try { return JSON.parse(v); } catch { return fallback; }
  }

  function renderProfilePreview() {
    const raw = localStorage.getItem('mb_profile');
    if (!raw) return;
    const p = safeJSON(raw, null);
    if (!p) return;

    const name = p.name || p.nickname || 'Player';
    const avatar = p.avatar || p.avatar_url || '';

    const nameEl = header.querySelector('[data-profile-name]');
    if (nameEl) nameEl.textContent = name;

    const hint = header.querySelector('[data-profile-hint]');
    if (hint) hint.textContent = 'Edit';

    const img = header.querySelector('.mbqTopbar__avatar img');
    if (img) {
      img.referrerPolicy = 'no-referrer';
      img.src = avatar || `${prefix}assets/uploadavatar.jpg`;
    }
  }

  function setupLogoFallback() {
    const logo = header.querySelector('.mbqTopbar__logo');
    if (!logo) return;

    const vid = logo.querySelector('video');
    const img = logo.querySelector('img');

    // Always show IMG first (safe)
    if (img) img.style.display = 'block';

    // iOS: do NOT show webm (black background / alpha issues)
    if (isIOS) {
      if (vid) vid.remove();

      // If you add a transparent PNG, we'll prefer it automatically:
      // /assets/logo.png  (transparent)
      if (img) {
        const preferred = `${prefix}assets/logo.png`;
        const fallback = img.src;

        // Try logo.png; if missing, keep existing favicon
        img.onerror = () => { img.onerror = null; img.src = fallback; };
        img.src = preferred;
      }
      return;
    }

    // Non-iOS: video preferred; hide IMG only when video can render
    if (vid) {
      const hideImg = () => { if (img) img.style.display = 'none'; };
      const showImg = () => { if (img) img.style.display = 'block'; };

      vid.addEventListener('loadeddata', hideImg, { once: true });
      vid.addEventListener('canplay', hideImg, { once: true });
      vid.addEventListener('error', showImg, { once: true });

      setTimeout(() => { try { vid.play(); } catch (_) {} }, 50);
    }
  }

  function setupMenu() {
    
  // Achievements:
  // - on Home (where modal exists) main app.js handles opening the modal
  // - on other pages, redirect to Home + open via hash
  const achievementsBtn = document.getElementById("achievementsBtn");
  achievementsBtn?.addEventListener("click", (e) => {
    const modal = document.getElementById("rewardsModal");
    if (modal) return; // home handles modal open
    e.preventDefault?.();
    window.location.href = `${prefix}index.html#achievements`;
  });

const burgerBtn = header.querySelector('#mbqBurgerBtn');
    const overlay = header.querySelector('#mbqMenuOverlay');
    const menu = header.querySelector('#mbqMenu');
    const closeBtn = header.querySelector('#mbqMenuClose');

    const openMenu = () => {
      if (!overlay || !menu || !burgerBtn) return;
      overlay.hidden = false;
      menu.hidden = false;
      burgerBtn.setAttribute('aria-expanded', 'true');
      document.documentElement.classList.add('mbqMenuOpen');
      document.body.style.overflow = 'hidden';
    };

    const closeMenu = () => {
      if (!overlay || !menu || !burgerBtn) return;
      overlay.hidden = true;
      menu.hidden = true;
      burgerBtn.setAttribute('aria-expanded', 'false');
      document.documentElement.classList.remove('mbqMenuOpen');
      document.body.style.overflow = '';
    };

    if (burgerBtn && overlay && menu) {
      burgerBtn.addEventListener('click', () => {
        if (menu.hidden) openMenu();
        else closeMenu();
      });
      overlay.addEventListener('click', closeMenu);
      if (closeBtn) closeBtn.addEventListener('click', closeMenu);

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !menu.hidden) closeMenu();
      });
    }

    // Achievements from burger menu: reuse the same behavior as the top button
    const achFromMenu = header.querySelector('#mbqMenuAchievements');
    if (achFromMenu) {
      achFromMenu.addEventListener('click', (e) => {
        e.preventDefault();
        closeMenu();
        const btn = header.querySelector('#achievementsBtn');
        if (btn) btn.click();
      });
    }
  }

  function initTopbar() {
    if (document.querySelector('header.mbqTopbar')) return;
    if (!document.body) return;

    document.body.insertBefore(header, document.body.firstChild);

    setupLogoFallback();
    setupMenu();

    // Always keep topbar actions working on every page.
    // If the current page doesn't have the modals wired, redirect to Home with a hash.
    const homeHref = `${prefix}index.html`;
    const isHome =
      /\/index\.html$/i.test(pathLower) &&
      !pathLower.includes('/leaderboard/') &&
      !pathLower.includes('/seasons/');

    const achBtn = header.querySelector('#achievementsBtn');
    if (achBtn) {
      achBtn.addEventListener('click', (e) => {
        const hasModal = !!document.getElementById('rewardsModal');
        if (!isHome || !hasModal) {
          e.preventDefault();
          window.location.href = `${homeHref}#achievements`;
          return;
        }
      });
    }

    const pill = header.querySelector('#profilePill');
    if (pill) {
      pill.addEventListener('click', (e) => {
        const hasModal = !!document.getElementById('profileModal');
        if (!isHome || !hasModal) {
          e.preventDefault();
          window.location.href = `${homeHref}#edit-profile`;
          return;
        }
      });
    }

    // Render basic profile display even without app.js
    renderProfilePreview();

    // Optional deep-link behavior
    if (window.location.hash === '#achievements') {
      const btn = header.querySelector('#achievementsBtn');
      if (btn) setTimeout(() => btn.click(), 80);
    }
    if (window.location.hash === '#edit-profile') {
      const p = header.querySelector('#profilePill');
      if (p) setTimeout(() => p.click(), 80);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTopbar);
  } else {
    initTopbar();
  }

  setTimeout(() => {
    if (!document.querySelector('header.mbqTopbar')) initTopbar();
  }, 0);
})();
