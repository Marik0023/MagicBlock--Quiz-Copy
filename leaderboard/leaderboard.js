/* global MBQ_LEADERBOARD */

(function () {
  const REPO_BASE = (() => {
    const parts = (location.pathname || "").split("/").filter(Boolean);
    if (!parts.length) return "/";
    return "/" + parts[0] + "/";
  })();
  const AVATAR_PLACEHOLDER = REPO_BASE + "assets/uploadavatar.jpg";
  const SUPABASE_URL = (window.MBQ_SUPABASE_URL || "").replace(/\/$/, "");

  function readLocalProfile() {
    try {
      const raw = localStorage.getItem('mb_profile');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function getLocalDeviceId() {
    try {
      const p = readLocalProfile();
      if (p?.device_id) return String(p.device_id);
    } catch {}
    try {
      const v = localStorage.getItem('mb_device_id');
      if (v) return v;
    } catch {}
    try {
      const parts = (document.cookie || '').split(';').map(s => s.trim());
      for (const p of parts) {
        if (p.startsWith('mbq_device_id=')) return decodeURIComponent(p.slice('mbq_device_id='.length));
      }
    } catch {}
    return '';
  }

  function toAbsoluteUrlMaybe(u) {
    if (!u) return '';
    if (typeof u !== 'string') return String(u);
    if (/^(https?:)?\/\//i.test(u) || u.startsWith('data:')) return u;
    try { return new URL(u, window.location.href).href; } catch { return u; }
  }

  function derivedAvatarUrls(deviceId) {
    if (!SUPABASE_URL || !deviceId) return { primary: "", legacy: "" };
    return {
      primary: `${SUPABASE_URL}/storage/v1/object/public/mbq-avatars/${deviceId}.png`,
      legacy: `${SUPABASE_URL}/storage/v1/object/public/mbq-avatars/avatars/${deviceId}.png`,
    };
  }
  function derivedChampUrl(seasonId, deviceId) {
    if (!SUPABASE_URL || !deviceId) return "";
    const sid = seasonId === 2 ? "s2" : "s1";
    return `${SUPABASE_URL}/storage/v1/object/public/mbq-champions/${sid}/${deviceId}.png`;
  }

  const $list = document.getElementById('lbList');
  const $meta = document.getElementById('lbMeta');
  const $search = document.getElementById('lbSearch');
  const $refresh = document.getElementById('lbRefresh');
  // Sort UI removed by design — leaderboard is always sorted by Total.

  if (!window.MBQ_LEADERBOARD) {
    $list.innerHTML = '<div class="lb-empty">Leaderboard client is not loaded.</div>';
    return;
  }

  let rows = [];

  function safeText(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));
  }

  function fmtScore(score, total) {
    if (typeof score !== 'number' || typeof total !== 'number') return '—';
    return `${score}/${total}`;
  }

  function sortRows(list) {
    const byUpdated = (a, b) => (Date.parse(b.updated_at || b.created_at || '') || 0) - (Date.parse(a.updated_at || a.created_at || '') || 0);
    return list.sort((a,b) => {
      const ta = Number(a.total_score || 0);
      const tb = Number(b.total_score || 0);
      if (tb !== ta) return tb - ta;
      return byUpdated(a,b);
    });
  }

  function render(list) {
    if (!list.length) {
      $list.innerHTML = '<div class="lb-empty">No entries yet.</div>';
      return;
    }

    const localDeviceId = getLocalDeviceId();
    const localProfile = readLocalProfile();

    $list.innerHTML = list.map((r, idx) => {
      const nick = safeText(r.nickname || 'Anonymous');
      const av = derivedAvatarUrls(r.device_id);

      const isMe = !!localDeviceId && r.device_id === localDeviceId;
      const localAvatar = isMe ? (localProfile?.avatar || localProfile?.avatar_url || '') : '';
      const avatarResolved = (localAvatar ? toAbsoluteUrlMaybe(localAvatar) : (r.avatar_url || av.primary || ''));
      let avatarResolvedBusted = avatarResolved;
      try {
        const stamp = encodeURIComponent((r.updated_at || r.created_at || '') + '');
        if (avatarResolvedBusted && avatarResolvedBusted.includes('/storage/v1/object/public/mbq-avatars/')) {
          avatarResolvedBusted += (avatarResolvedBusted.includes('?') ? '&' : '?') + 'v=' + stamp;
        }
        // If it's our local freshly edited avatar url, also bust with current time to reflect instantly.
        if (isMe && localAvatar && avatarResolvedBusted) {
          avatarResolvedBusted += (avatarResolvedBusted.includes('?') ? '&' : '?') + 't=' + Date.now();
        }
      } catch {}

      const avatar = avatarResolvedBusted ? safeText(avatarResolvedBusted) : AVATAR_PLACEHOLDER;
      const avatarLegacy = av.legacy ? safeText(av.legacy) : '';

      const hasS1 = !!r.champ_s1_url || Number(r.champ_s1_score || 0) > 0;
      const hasS2 = !!r.champ_s2_url || Number(r.champ_s2_score || 0) > 0;
      const s1Url = r.champ_s1_url || (hasS1 ? derivedChampUrl(1, r.device_id) : '');
      const s2Url = r.champ_s2_url || (hasS2 ? derivedChampUrl(2, r.device_id) : '');

      const totalScore = Number(r.total_score || 0);
      const s1Score = Number(r.champ_s1_score || 0);
      const s2Score = Number(r.champ_s2_score || 0);
      const s1Total = Number(r.champ_s1_total || 30);
      const s2Total = Number(r.champ_s2_total || 60);

      const rowCls = `lb-row ${isMe ? 'lb-me' : ''}`;

      // Card previews/badges are intentionally removed (clean table).

      return `
        <div class="${rowCls}">
          <div class="lb-rank">${idx + 1}</div>

          <div class="lb-user">
            <img class="lb-avatar" src="${avatar}" alt="${nick}"
              onerror="if(!this.dataset.try2 && '${avatarLegacy}') { this.dataset.try2='1'; this.src='${avatarLegacy}'; } else { this.onerror=null; this.src='${AVATAR_PLACEHOLDER}'; }" />
            <div class="lb-nameWrap">
              <div class="lb-nick">${nick}</div>
              <div class="lb-id">${safeText((r.device_id || '').slice(0, 8))}</div>
            </div>
          </div>

          <div class="lb-total">
            <span class="lb-chip"><strong>${totalScore}</strong> pts</span>
          </div>

          <div class="lb-season col-s1">
            <span class="lb-chip lb-score">${fmtScore(s1Score, s1Total)}</span>
          </div>

          <div class="lb-season col-s2">
            <span class="lb-chip lb-score">${fmtScore(s2Score, s2Total)}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function applySearch() {
    const q = ($search?.value || '').trim().toLowerCase();
    let filtered = rows;
    if (q) filtered = rows.filter(r => String(r.nickname || '').toLowerCase().includes(q));
    render(sortRows(filtered.slice()));
  }

  async function load() {
    $meta.textContent = 'Loading…';
    $refresh.disabled = true;

    try {
      // If you already have champion cards saved locally, re-sync your row before fetching.
      try {
        const s1png = localStorage.getItem('mb_champ_png_upload') || localStorage.getItem('mb_champ_png') || '';
        if (s1png.startsWith('data:image/')) await window.MBQ_LEADERBOARD.syncFromLocal('s1', s1png);
        const s2png = localStorage.getItem('mb_s2_champ_png_upload') || localStorage.getItem('mb_s2_champ_png') || '';
        if (s2png.startsWith('data:image/')) await window.MBQ_LEADERBOARD.syncFromLocal('s2', s2png);
      } catch (e) {
        console.warn('Sync skipped:', e);
      }

      rows = await window.MBQ_LEADERBOARD.fetchLeaderboard();

      // Dedupe by nickname (case-insensitive): keep most recent updated row.
      const byNick = new Map();
      for (const r of (Array.isArray(rows) ? rows : [])) {
        const key = String(r.nickname || '').trim().toLowerCase() || '__anon__';
        const prev = byNick.get(key);
        const t = Date.parse(r.updated_at || r.created_at || '') || 0;
        const pt = prev ? (Date.parse(prev.updated_at || prev.created_at || '') || 0) : -1;
        if (!prev || t > pt) byNick.set(key, r);
      }
      rows = Array.from(byNick.values());

      $meta.textContent = `${rows.length} players`;
      applySearch();
    } catch (e) {
      console.error(e);
      $list.innerHTML = '<div class="lb-empty">Failed to load leaderboard. Check Supabase policies/API keys.</div>';
      $meta.textContent = '';
    } finally {
      $refresh.disabled = false;
    }
  }

  $refresh.addEventListener('click', load);
  $search.addEventListener('input', applySearch);
  // Sort UI removed

  window.addEventListener('mbq:profile-updated', () => { try { applySearch(); } catch {} });

  load();
})();