(() => {
  // Relative prefix that works on GitHub Pages project sites:
  // /<repo>/<dirs>/<file.html> -> go back (dirs) to /<repo>/
  const parts = window.location.pathname.split('/').filter(Boolean);
  const depth = Math.max(0, parts.length - 2); // repo/<dirs...>/file.html
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
            <video autoplay muted loop playsinline>
              <source src="${prefix}assets/logo.webm" type="video/webm" />
            </video>
            <img src="${prefix}assets/faviconlogo/favicon-32x32.png" alt="" />
          </span>
          <span>MagicBlock Quiz</span>
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

  document.addEventListener('DOMContentLoaded', () => {
    document.body.insertBefore(header, document.body.firstChild);

    // Always keep topbar actions working on every page.
    // If the current page doesn't have the modals wired (e.g. leaderboard),
    // redirect to Home with a hash that will auto-open.
    const homeHref = `${prefix}index.html`;
    const achBtn = document.getElementById('achievementsBtn');
    if (achBtn){
      achBtn.addEventListener('click', (e) => {
        const hasModal = !!document.getElementById('rewardsModal');
        if (!hasModal){
          e.preventDefault();
          window.location.href = `${homeHref}#achievements`;
        }
      });
    }

    const pill = document.getElementById('profilePill');
    if (pill){
      pill.addEventListener('click', (e) => {
        const hasModal = !!document.getElementById('profileModal');
        if (!hasModal){
          e.preventDefault();
          window.location.href = `${homeHref}#edit-profile`;
        }
      });
    }

    // Render basic profile display (name + avatar) even without app.js.
    try{
      const raw = localStorage.getItem('mb_profile');
      if (raw){
        const p = JSON.parse(raw);
        const nameEl = document.querySelector('[data-profile-name]');
        if (nameEl && p.nickname) nameEl.textContent = p.nickname;
        const hint = document.querySelector('[data-profile-hint]');
        if (hint) hint.textContent = 'Edit';
        const img = document.querySelector('.mbqTopbar__avatar img');
        if (img){
          img.src = p.avatar_url || '';
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
  });
})();