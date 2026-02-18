(() => {
  // Relative prefix that works on GitHub Pages project sites:
  // /<repo>/<dirs>/<file.html> -> go back (dirs) to /<repo>/
  const parts = window.location.pathname.split('/').filter(Boolean);

  // Support both:
  // 1) GitHub Pages project path: /<repo>/seasons/s1/index.html
  // 2) Custom domain root path:   /seasons/s1/index.html
  const ROOT_DIRS = new Set(['seasons','leaderboard','assets']);
  const baseIndex = ROOT_DIRS.has((parts[0] || '').toLowerCase()) ? 0 : 1;

  const last = parts[parts.length - 1] || '';
  const hasFile = /\.[a-z0-9]+$/i.test(last);

  // How many ".." segments to reach the site root (repo root or domain root)
  const depthFromBase = Math.max(
    0,
    hasFile
      ? (parts.length - baseIndex - 2)  // exclude repo + filename
      : (parts.length - baseIndex - 1)  // exclude repo
  );

  const prefix = '../'.repeat(depthFromBase);
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
        <!-- Keep the same id/attributes so existing app.js logic works everywhere -->
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

  function initTopbar(){
    // Insert once
    if (!document.body || document.querySelector('header.mbqTopbar')) return;
    document.body.insertBefore(header, document.body.firstChild);

    // Logo: show animated webm by default; show fallback image only if video fails.
    const logo = header.querySelector('.mbqTopbar__logo');
    const vid = logo?.querySelector('video');
    const img = logo?.querySelector('img');

    // ✅ Keep a visible fallback logo at all times.
    // We hide the image ONLY after the video is actually ready to render.
    if (img) img.style.display = 'block';

    if (vid) {
      const showImg = () => { if (img) img.style.display = 'block'; };
      const hideImg = () => { if (img) img.style.display = 'none'; };

      // If video can render a frame -> use it.
      vid.addEventListener('loadeddata', hideImg, { once: true });
      vid.addEventListener('canplay', hideImg, { once: true });

      // If video fails (unsupported WebM, 404, etc.) -> keep image.
      vid.addEventListener('error', showImg, { once: true });

      // iOS/Safari sometimes doesn't fire error but also won't autoplay; keep fallback visible.
      // We only hide fallback after a positive "loadeddata/canplay" above.
    }
    // Some browsers need an explicit play call.
      setTimeout(() => { try { vid.play(); } catch(_){} }, 50);
    }

    // Always keep topbar actions working on every page.
    // If the current page doesn't have the modals wired (e.g. leaderboard),
    // redirect to Home with a hash that will auto-open.
    const homeHref = `${prefix}index.html`;
    // True only for the project root Home page, not for /leaderboard/index.html or other index pages.
    const isHome = /\/index\.html$/i.test(pathLower) && !pathLower.includes('/leaderboard/') && !pathLower.includes('/seasons/');
    const achBtn = document.getElementById('achievementsBtn');
    if (achBtn){
      achBtn.addEventListener('click', (e) => {
        // Always work everywhere:
        // - On Home: open the modal if present
        // - Else: redirect to Home hash that will auto-open
        const hasModal = !!document.getElementById('rewardsModal');
        if (!isHome || !hasModal){ e.preventDefault(); window.location.href = `${homeHref}#achievements`; return; }
      });
    }

    const pill = document.getElementById('profilePill');
    if (pill){
      pill.addEventListener('click', (e) => {
        const hasModal = !!document.getElementById('profileModal');
        if (!isHome || !hasModal){ e.preventDefault(); window.location.href = `${homeHref}#edit-profile`; return; }
      });
    }

    // Render basic profile display (name + avatar) even without app.js.
    try{
      const raw = localStorage.getItem('mb_profile');
      if (raw){
        const p = JSON.parse(raw);
        const nameEl = document.querySelector('[data-profile-name]');
        if (nameEl) nameEl.textContent = (p.nickname || p.name || 'Player');
        const hint = document.querySelector('[data-profile-hint]');
        if (hint) hint.textContent = 'Edit';
        const img = document.querySelector('.mbqTopbar__avatar img');
        if (img){
          img.src = (p.avatar_url || p.avatar || (prefix + 'assets/uploadavatar.jpg'));
          img.referrerPolicy = 'no-referrer';
        }
      }
    }catch(_){/* ignore */}

    // Optional deep-link behavior
    if (window.location.hash === '#achievements') {
      const btn = document.getElementById('achievementsBtn');
      if (btn) setTimeout(() => btn.click(), 80);
    }
    if (window.location.hash === '#edit-profile') {
      const pill = document.getElementById('profilePill');
      if (pill) setTimeout(() => pill.click(), 80);
    }
  }

  // Init whether the script is loaded with defer or after DOMContentLoaded.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTopbar);
  } else {
    initTopbar();
  }
})();