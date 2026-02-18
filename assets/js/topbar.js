(() => {
  // Compute a relative prefix that works for BOTH:
  // 1) GitHub Pages project path: /<repo>/seasons/s1/index.html
  // 2) Custom domain root path:   /seasons/s1/index.html
  const parts = window.location.pathname.split('/').filter(Boolean);
  const ROOT_DIRS = new Set(['seasons', 'leaderboard', 'assets']);
  const baseIndex = ROOT_DIRS.has((parts[0] || '').toLowerCase()) ? 0 : 1;

  const last = parts[parts.length - 1] || '';
  const hasFile = /\.[a-z0-9]+$/i.test(last);

  // How many directories deep we are from the site root (repo root or domain root)
  const depth = Math.max(0, (hasFile ? (parts.length - baseIndex - 1) : (parts.length - baseIndex)));
  const prefix = '../'.repeat(depth);

  const pathLower = window.location.pathname.toLowerCase();
  const isActive = (key) => {
    if (key === 'seasons') return pathLower.includes('/seasons/') || pathLower.endsWith('/index.html') || pathLower.endsWith('/');
    if (key === 'leaderboard') return pathLower.includes('/leaderboard/');
    return false;
  };

  const header = document.createElement('header');
  header.className = 'mbqTopbar';
  header.innerHTML = `
    <div class="mbqTopbar__inner">
      <div class="mbqTopbar__left">
        <a class="mbqTopbar__brand" href="${prefix}index.html" aria-label="MagicBlock Quiz Home">
          <span class="mbqTopbar__logo" aria-hidden="true">
            <video autoplay muted loop playsinline preload="auto">
              <source src="${prefix}assets/logo.webm" type="video/webm" />
            </video>
            <img src="${prefix}assets/faviconlogo/favicon-32x32.png" alt="" />
          </span>
        </a>
      </div>

      <nav class="mbqTopbar__nav" aria-label="Primary">
        <a href="${prefix}index.html" class="${isActive('seasons') ? 'is-active' : ''}">Seasons</a>
        <a href="${prefix}leaderboard/index.html" class="${isActive('leaderboard') ? 'is-active' : ''}">Leaderboard</a>
        <button type="button" id="achievementsBtn">Achievements</button>
      </nav>

      <div class="mbqTopbar__right">
        <button type="button" class="mbqTopbar__profile" id="profilePill" title="Profile">
          <div class="mbqTopbar__avatar"><img alt="" /></div>
          <div class="mbqTopbar__ptext">
            <div class="mbqTopbar__pname" data-profile-name>Player</div>
            <div class="mbqTopbar__pedit" data-profile-hint>Edit</div>
          </div>
        </button>
      </div>
    </div>
  `;

  function safeJSON(v, fallback = null){
    try { return JSON.parse(v); } catch { return fallback; }
  }

  function renderProfilePreview(){
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
    if (img){
      img.referrerPolicy = 'no-referrer';
      img.src = avatar || `${prefix}assets/uploadavatar.jpg`;
    }
  }

  function initTopbar(){
    // Insert once
    if (document.querySelector('header.mbqTopbar')) return;
    if (!document.body) return;

    document.body.insertBefore(header, document.body.firstChild);

    // Logo fallback behavior:
    // - Keep IMG visible by default
    // - Hide IMG only after the video is actually ready to render a frame
    const logo = header.querySelector('.mbqTopbar__logo');
    const vid = logo ? logo.querySelector('video') : null;
    const img = logo ? logo.querySelector('img') : null;

    if (img) img.style.display = 'block';

    if (vid){
      const hideImg = () => { if (img) img.style.display = 'none'; };
      const showImg = () => { if (img) img.style.display = 'block'; };

      vid.addEventListener('loadeddata', hideImg, { once: true });
      vid.addEventListener('canplay', hideImg, { once: true });
      vid.addEventListener('error', showImg, { once: true });

      setTimeout(() => { try { vid.play(); } catch(_){} }, 50);
    }

    // Always keep topbar actions working on every page.
    // If the current page doesn't have the modals wired, redirect to Home with a hash.
    const homeHref = `${prefix}index.html`;
    const isHome = /\/index\.html$/i.test(pathLower) && !pathLower.includes('/leaderboard/') && !pathLower.includes('/seasons/');

    const achBtn = header.querySelector('#achievementsBtn');
    if (achBtn){
      achBtn.addEventListener('click', (e) => {
        const hasModal = !!document.getElementById('rewardsModal');
        if (!isHome || !hasModal){ e.preventDefault(); window.location.href = `${homeHref}#achievements`; return; }
      });
    }

    const pill = header.querySelector('#profilePill');
    if (pill){
      pill.addEventListener('click', (e) => {
        const hasModal = !!document.getElementById('profileModal');
        if (!isHome || !hasModal){ e.preventDefault(); window.location.href = `${homeHref}#edit-profile`; return; }
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

  // Init whether the script is loaded with defer or after DOMContentLoaded.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTopbar);
  } else {
    initTopbar();
  }

  // If script loaded too early (very rare), retry once more on next tick.
  setTimeout(() => { if (!document.querySelector('header.mbqTopbar')) initTopbar(); }, 0);
})();