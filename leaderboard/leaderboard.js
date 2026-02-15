/* global MBQ_LEADERBOARD */

(function () {
  const REPO_BASE = (() => {
    const parts = (location.pathname || "").split("/").filter(Boolean);
    if (!parts.length) return "/";
    return "/" + parts[0] + "/";
  })();
  const AVATAR_PLACEHOLDER = REPO_BASE + "assets/uploadavatar.jpg";

    const SUPABASE_URL = (window.MBQ_SUPABASE_URL || "").replace(/\/$/, "");

  function derivedAvatarUrl(deviceId) {
    if (!SUPABASE_URL || !deviceId) return "";
    return `${SUPABASE_URL}/storage/v1/object/public/mbq-avatars/avatars/${deviceId}.png`;
  }
  function derivedChampUrl(seasonId, deviceId) {
    if (!SUPABASE_URL || !deviceId) return "";
    const sid = seasonId === 2 ? "s2" : "s1";
    return `${SUPABASE_URL}/storage/v1/object/public/mbq-champions/${sid}/${deviceId}.png`;
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
      const avatarResolved = r.avatar_url || derivedAvatarUrl(r.device_id) || '';
      const avatar = avatarResolved ? safeText(avatarResolved) : AVATAR_PLACEHOLDER;

      const s1Url = r.champ_s1_url || derivedChampUrl(1, r.device_id);
      const s2Url = r.champ_s2_url || derivedChampUrl(2, r.device_id);

      const s1img = s1Url ? `<img class="lb-cardimg" loading="lazy" src="${safeText(s1Url)}" alt="Champion S1" />` : '<span class="lb-scorechip">No card</span>';
      const s2img = s2Url ? `<img class="lb-cardimg" loading="lazy" src="${safeText(s2Url)}" alt="Champion S2" />` : '<span class="lb-scorechip">No card</span>';

      const totalChip = `<span class="lb-scorechip"><strong>${Number(r.total_score || 0)}</strong> pts</span>`;
      const s1Chip = `<span class="lb-scorechip">${fmtScore(Number(r.champ_s1_score || 0), Number(r.champ_s1_total || 30))}</span>`;
      const s2Chip = `<span class="lb-scorechip">${fmtScore(Number(r.champ_s2_score || 0), Number(r.champ_s2_total || 60))}</span>`;

      return `
        <tr>
          <td class="lb-rank">${idx + 1}</td>
          <td>
            <div class="lb-user">
              <img class="lb-avatar" src="${avatar}" alt="${nick}" />
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

      // Dedupe by nickname (case-insensitive) to hide old test profiles with the same name.
      // Keep the most recently updated row for each nickname.
      const byNick = new Map();
      for (const r of (Array.isArray(rows) ? rows : [])) {
        const key = String(r.nickname || '').trim().toLowerCase() || '__anon__';
        const prev = byNick.get(key);
        const t = Date.parse(r.updated_at || r.created_at || '') || 0;
        const pt = prev ? (Date.parse(prev.updated_at || prev.created_at || '') || 0) : -1;
        if (!prev || t > pt) byNick.set(key, r);
      }
      rows = Array.from(byNick.values());

      // Sort: total desc, then updated desc
      rows.sort((a, b) => {
        const ta = Number(a.total_score || 0);
        const tb = Number(b.total_score || 0);
        if (tb !== ta) return tb - ta;
        const da = Date.parse(a.updated_at || a.created_at || '') || 0;
        const db = Date.parse(b.updated_at || b.created_at || '') || 0;
        return db - da;
      });

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
