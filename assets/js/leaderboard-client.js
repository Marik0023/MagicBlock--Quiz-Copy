/*
  MagicBlock Quiz — Leaderboard + Supabase sync (public / no-auth)

  What this file does:
  - Generates a stable device_id stored in localStorage
  - Uploads user's avatar into Storage bucket: mbq-avatars
  - Uploads champion cards into Storage bucket: mbq-champions
  - Upserts a row into table: public.leaderboard
      device_id, nickname, avatar_url,
      champ_s1_url, champ_s2_url,
      champ_s1_score, champ_s2_score,
      champ_s1_total, champ_s2_total,
      total_score, updated_at

  HTML requirements (order matters):
    1) <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    2) <script src="/assets/js/supabase-config.js"></script>
    3) <script src="/assets/js/leaderboard-client.js"></script>
*/

(function () {
  const LS = window.localStorage;

  const KEYS = {
    deviceId: 'mbq_device_id',
    profile: 'mbq_profile_v1',
    // Season 1 results
    s1Song: 'mb_result_song',
    s1Movie: 'mb_result_movieframe',
    s1Magic: 'mb_result_magic',
    // Season 2 results
    s2Song: 'mb_s2_res_song',
    s2Movie: 'mb_s2_res_movie',
    s2Magic: 'mb_s2_res_magic',
    s2Anime: 'mb_s2_res_anime',
    s2Logic: 'mb_s2_res_logic',
    s2Easter: 'mb_s2_res_easter',
  };

  function safeJsonParse(str, fallback) {
    try {
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  }

  function getDeviceId() {
    let id = LS.getItem(KEYS.deviceId);
    if (id) return id;
    // Prefer crypto.randomUUID
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      id = window.crypto.randomUUID();
    } else {
      id = `mbq_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
    }
    LS.setItem(KEYS.deviceId, id);
    return id;
  }

  function getProfile() {
    const raw = LS.getItem(KEYS.profile);
    const p = safeJsonParse(raw, null);
    if (!p || typeof p !== 'object') {
      return { name: 'Anonymous', avatar: null };
    }
    return {
      name: (p.name || 'Anonymous').toString().slice(0, 32),
      avatar: p.avatar || null,
    };
  }

  function dataUrlToBlob(dataUrl) {
    const parts = dataUrl.split(',');
    if (parts.length < 2) return null;
    const header = parts[0];
    const base64 = parts[1];
    const mimeMatch = header.match(/data:(.*?);base64/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const bin = atob(base64);
    const len = bin.length;
    const arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  function ensureSupabase() {
    if (!window.supabase || !window.MBQ_SUPABASE_URL || !window.MBQ_SUPABASE_ANON_KEY) {
      throw new Error('Supabase not configured. Make sure supabase-js + supabase-config are loaded.');
    }
    if (!window.__mbq_sb_client) {
      window.__mbq_sb_client = window.supabase.createClient(
        window.MBQ_SUPABASE_URL,
        window.MBQ_SUPABASE_ANON_KEY
      );
    }
    return window.__mbq_sb_client;
  }

  function getPublicUrl(sb, bucket, path) {
    const { data } = sb.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl || null;
  }

  async function uploadIfDataUrl(sb, bucket, path, maybeDataUrl) {
    if (!maybeDataUrl || typeof maybeDataUrl !== 'string') return null;
    if (!maybeDataUrl.startsWith('data:')) {
      // Already a URL (or relative path) — store as-is
      return maybeDataUrl;
    }
    const blob = dataUrlToBlob(maybeDataUrl);
    if (!blob) return null;

    const { error } = await sb.storage.from(bucket).upload(path, blob, {
      upsert: true,
      contentType: blob.type || 'image/png',
      cacheControl: '3600',
    });
    if (error) throw error;
    return getPublicUrl(sb, bucket, path);
  }

  function readResult(key) {
    const raw = LS.getItem(key);
    const r = safeJsonParse(raw, null);
    if (!r || typeof r !== 'object') return { correct: 0, total: 0 };
    return {
      correct: Number(r.correct || 0) || 0,
      total: Number(r.total || 0) || 0,
    };
  }

  function computeSeason(seasonId) {
    if (seasonId === 's1') {
      const a = readResult(KEYS.s1Song);
      const b = readResult(KEYS.s1Movie);
      const c = readResult(KEYS.s1Magic);
      return {
        score: a.correct + b.correct + c.correct,
        total: 30,
      };
    }
    if (seasonId === 's2') {
      const a = readResult(KEYS.s2Song);
      const b = readResult(KEYS.s2Movie);
      const c = readResult(KEYS.s2Magic);
      const d = readResult(KEYS.s2Anime);
      const e = readResult(KEYS.s2Logic);
      const f = readResult(KEYS.s2Easter);
      return {
        score: a.correct + b.correct + c.correct + d.correct + e.correct + f.correct,
        total: 60,
      };
    }
    return { score: 0, total: 0 };
  }

  async function upsertLeaderboardRow(payload) {
    const sb = ensureSupabase();
    const { error } = await sb
      .from('leaderboard')
      .upsert(payload, { onConflict: 'device_id' });
    if (error) throw error;
  }

  /**
   * Syncs user's profile + champion card to Supabase
   * @param {'s1'|'s2'} seasonId
   * @param {string} championPngDataUrl - data:image/png;base64,...
   */
  async function syncFromLocal(seasonId, championPngDataUrl) {
    const sb = ensureSupabase();
    const deviceId = getDeviceId();
    const profile = getProfile();

    // 1) Avatar upload (only if it's a data URL)
    const avatarPath = `avatars/${deviceId}.png`;
    const avatarUrl = await uploadIfDataUrl(sb, 'mbq-avatars', avatarPath, profile.avatar);

    // 2) Champion upload
    const champPath = `champions/${deviceId}/${seasonId}.png`;
    const champUrl = await uploadIfDataUrl(sb, 'mbq-champions', champPath, championPngDataUrl);

    // 3) Scores
    const s1 = computeSeason('s1');
    const s2 = computeSeason('s2');
    const totalScore = (s1.score || 0) + (s2.score || 0);

    const nowIso = new Date().toISOString();
    const base = {
      device_id: deviceId,
      nickname: profile.name,
      avatar_url: avatarUrl,
      champ_s1_score: s1.score,
      champ_s1_total: 30,
      champ_s2_score: s2.score,
      champ_s2_total: 60,
      total_score: totalScore,
      updated_at: nowIso,
    };

    if (seasonId === 's1') base.champ_s1_url = champUrl;
    if (seasonId === 's2') base.champ_s2_url = champUrl;

    await upsertLeaderboardRow(base);
    return { ok: true, deviceId, avatarUrl, champUrl, totalScore };
  }

  // Expose small API
  window.MBQ_LEADERBOARD = {
    getDeviceId,
    computeSeason,
    syncFromLocal,
  };
})();
