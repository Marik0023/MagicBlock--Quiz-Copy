/* global MBQ_LEADERBOARD */

(function () {
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
      const avatar = r.avatar_url ? safeText(r.avatar_url) : '../assets/images/avatar_placeholder.png';
      const s1img = r.champ_s1_url ? `<img class="lb-cardimg" loading="lazy" src="${safeText(r.champ_s1_url)}" alt="Champion S1" />` : '<span class="lb-scorechip">No card</span>';
      const s2img = r.champ_s2_url ? `<img class="lb-cardimg" loading="lazy" src="${safeText(r.champ_s2_url)}" alt="Champion S2" />` : '<span class="lb-scorechip">No card</span>';

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
