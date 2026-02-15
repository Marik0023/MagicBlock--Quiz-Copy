/* global MBQ_LEADERBOARD */

(function () {
  const REPO_BASE = (() => {
    const parts = (location.pathname || "").split("/").filter(Boolean);
    if (!parts.length) return "/";
    return "/" + parts[0] + "/";
  })();
  const AVATAR_PLACEHOLDER = REPO_BASE + "assets/uploadavatar.jpg";
  const SB_URL = window.MBQ_SUPABASE_URL || "";

  function storagePublic(bucket, path) {
    if (!SB_URL) return "";
    return `${SB_URL}/storage/v1/object/public/${bucket}/${path}`;
  }

  function avatarSrcs(deviceId) {
    if (!deviceId) return { primary: AVATAR_PLACEHOLDER, fallback: AVATAR_PLACEHOLDER };
    return {
      primary: storagePublic("mbq-avatars", `avatars/${deviceId}.png`),
      fallback: storagePublic("mbq-avatars", `avatars/${deviceId}.jpg`) || AVATAR_PLACEHOLDER,
    };
  }

  function champSrc(seasonNum, deviceId) {
    if (!deviceId) return "";
    const seasonFolder = seasonNum === 2 ? "s2" : "s1";
    return storagePublic("mbq-champions", `${seasonFolder}/${deviceId}.png`);
  }

  const $body = document.getElementById('lbBody');
  const $meta = document.getElementById('lbMeta');
  const $search = document.getElementById('lbSearch');
  const $refresh = document.getElementById('lbRefresh');

  if (!window.MBQ_LEADERBOARD) {
    $body.innerHTML = '<tr><td colspan="5" class="lb-empty">Leaderboard client is not loaded.</td></tr>';
    return;
  }

  let rows = [];

  function fmtScore(score, total) {
    if (typeof score !== 'number' || typeof total !== 'number') return '—';
    return `${score}/${total}`;
  }

  function safeText(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));
  }

  function render(list) {
    if (!list.length) {
      $body.innerHTML = '<tr><td colspan="5" class="lb-empty">No entries yet.</td></tr>';
      return;
    }

    $body.innerHTML = list.map((r, idx) => {
      const nick = safeText(r.nickname || 'Anonymous');
      const deviceId = String(r.device_id || '');

      // We intentionally derive image URLs from device_id so we don't depend on DB columns
      // (and so Edge Function validation for avatar_url can't break submissions).
      const a = avatarSrcs(deviceId);
      const avatar = r.avatar_url ? safeText(r.avatar_url) : safeText(a.primary || AVATAR_PLACEHOLDER);
      const avatarFallback = safeText(a.fallback || AVATAR_PLACEHOLDER);

      const s1url = r.champ_s1_url ? safeText(r.champ_s1_url) : safeText(champSrc(1, deviceId));
      const s2url = r.champ_s2_url ? safeText(r.champ_s2_url) : safeText(champSrc(2, deviceId));

      const s1img = s1url ? `<img class="lb-cardimg" loading="lazy" src="${s1url}" alt="Champion S1" onerror="this.onerror=null;this.style.display='none';" />` : '<span class="lb-scorechip">No card</span>';
      const s2img = s2url ? `<img class="lb-cardimg" loading="lazy" src="${s2url}" alt="Champion S2" onerror="this.onerror=null;this.style.display='none';" />` : '<span class="lb-scorechip">No card</span>';

      const totalChip = `<span class="lb-scorechip"><strong>${Number(r.total_score || 0)}</strong> pts</span>`;
      const s1Chip = `<span class="lb-scorechip">${fmtScore(Number(r.champ_s1_score || 0), Number(r.champ_s1_total || 30))}</span>`;
      const s2Chip = `<span class="lb-scorechip">${fmtScore(Number(r.champ_s2_score || 0), Number(r.champ_s2_total || 60))}</span>`;

      return `
        <tr>
          <td class="lb-rank">${idx + 1}</td>
          <td>
            <div class="lb-user">
              <img class="lb-avatar" src="${avatar}" alt="${nick}" data-f="0" onerror="if(this.dataset.f==='0'){this.dataset.f='1';this.src='${avatarFallback}';}else{this.onerror=null;this.src='${safeText(AVATAR_PLACEHOLDER)}';}" />
              
              <div>
                <div class="lb-nick">${nick}</div>
                <div class="lb-meta" style="opacity:.7">${safeText((r.device_id || '').slice(0, 10))}</div>
              </div>
            </div>
          </td>
          <td>${totalChip}</td>
          <td>
            <div class="lb-cards">
              ${s1Chip}
              ${s1img}
            </div>
          </td>
          <td>
            <div class="lb-cards">
              ${s2Chip}
              ${s2img}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function applySearch() {
    const q = ($search.value || '').trim().toLowerCase();
    if (!q) return render(rows);
    const filtered = rows.filter(r => String(r.nickname || '').toLowerCase().includes(q));
    render(filtered);
  }

  async function load() {
    $meta.textContent = 'Loading…';
    $refresh.disabled = true;
    try {
      // If you already have champion cards saved locally, re-sync your row before fetching.
      try {
        const s1png = localStorage.getItem('mb_champ_png_upload') || localStorage.getItem('mb_champ_png') || '';
        if (s1png.startsWith('data:image/')) {
          await window.MBQ_LEADERBOARD.syncFromLocal('s1', s1png);
        }
        const s2png = localStorage.getItem('mb_s2_champ_png_upload') || localStorage.getItem('mb_s2_champ_png') || '';
        if (s2png.startsWith('data:image/')) {
          await window.MBQ_LEADERBOARD.syncFromLocal('s2', s2png);
        }
      } catch (e) {
        console.warn('Sync skipped:', e);
      }

      rows = await window.MBQ_LEADERBOARD.fetchLeaderboard();
      $meta.textContent = `${rows.length} players`;
      applySearch();
    } catch (e) {
      console.error(e);
      $body.innerHTML = '<tr><td colspan="5" class="lb-empty">Failed to load leaderboard. Check Supabase policies/API keys.</td></tr>';
      $meta.textContent = '';
    } finally {
      $refresh.disabled = false;
    }
  }

  $refresh.addEventListener('click', load);
  $search.addEventListener('input', applySearch);

  load();
})();
