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
          <img src="${prefix}assets/faviconlogo/favicon-32x32.png" alt="MagicBlock">
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