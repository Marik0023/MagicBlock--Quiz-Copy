// assets/js/leaderboard-client.js
// Upload avatar + champion images to Supabase Storage (public buckets)
// Submit leaderboard updates via Edge Function (no public DB write access in browser)

(function () {
  // Existing project keys (already used across seasons)
  const MB_KEYS = {
    profile: "mb_profile",

    // Season 1 results (10+10+10 = 30)
    s1Song: "mb_result_song",
    s1Movie: "mb_result_movie",
    s1Magic: "mb_result_magicblock",

    // Season 2 results (20+20+20 = 60)
    s2Song: "mb_s2_result_song",
    s2Movie: "mb_s2_result_movieframe",
    s2MovieEmoji: "mb_s2_result_movieemoji",
    s2Silhouette: "mb_s2_result_silhouette",
    s2TrueFalse: "mb_s2_result_truefalse",
    s2Magic: "mb_s2_result_magicblock",
  };

  // Our stable per-browser device id (used as filename in Storage + upsert key)
  const DEVICE_KEY = "mb_device_id";

  function getConfig() {
    const url = window.MBQ_SUPABASE_URL;
    const key = window.MBQ_SUPABASE_ANON_KEY; // may be publishable key
    if (!url || !key) throw new Error("Missing Supabase config (assets/js/supabase-config.js).");
    return { url, key };
  }

  // Create ONE Supabase client per page (prevents "Multiple GoTrueClient instances" warnings)
  function getClientSingleton() {
    const { url, key } = getConfig();
    if (!window.supabase?.createClient) {
      throw new Error("Supabase JS not loaded. Include it before leaderboard-client.js");
    }
    if (window.MBQ_SUPABASE_CLIENT) return window.MBQ_SUPABASE_CLIENT;

    // IMPORTANT: persistSession must be TRUE so anonymous auth is remembered
    // and Storage RLS checks (owner = auth.uid()) can pass.
    window.MBQ_SUPABASE_CLIENT = window.supabase.createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
    return window.MBQ_SUPABASE_CLIENT;
  }

  // Ensure we are authenticated (anonymous sign-in) before any Storage upload.
  async function getAuthedClient() {
    const client = getClientSingleton();
    if (window.MBQ_SUPABASE_AUTH_PROMISE) {
      await window.MBQ_SUPABASE_AUTH_PROMISE;
      return client;
    }

    window.MBQ_SUPABASE_AUTH_PROMISE = (async () => {
      const { data, error } = await client.auth.getSession();
      if (error) console.warn("Supabase getSession error:", error);
      if (!data?.session) {
        const { error: signErr } = await client.auth.signInAnonymously();
        if (signErr) throw signErr;
      }
    })();

    await window.MBQ_SUPABASE_AUTH_PROMISE;
    return client;
  }

  function isDataUrlImage(s) {
    return typeof s === "string" && s.startsWith("data:image/");
  }

  function isNonEmpty(s) {
    return typeof s === "string" && s.trim().length > 0;
  }

  function isAbsoluteUrl(u) {
    return typeof u === "string" && /^(https?:)?\/\//i.test(u);
  }

  // Resolve relative asset paths (e.g. "assets/uploadavatar.jpg") to an absolute URL
  function toAbsoluteUrlMaybe(u) {
    if (!isNonEmpty(u)) return null;
    if (isAbsoluteUrl(u) || u.startsWith('data:')) return u;
    try {
      return new URL(u, window.location.href).href;
    } catch {
      return u;
    }
  }

  function getOrCreateDeviceId() {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = (crypto?.randomUUID?.() || ("dev_" + Math.random().toString(36).slice(2) + Date.now()));
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  }

  function readJson(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function getProfile() {
    return readJson(MB_KEYS.profile);
  }

  function safeInt(x, fallback = 0) {
    const n = Number(x);
    return Number.isFinite(n) ? Math.trunc(n) : fallback;
  }

  function getSeasonScore(seasonId) {
    if (seasonId === "s1") {
      const a = readJson(MB_KEYS.s1Song);
      const b = readJson(MB_KEYS.s1Movie);
      const c = readJson(MB_KEYS.s1Magic);
      const score = safeInt(a?.correct) + safeInt(b?.correct) + safeInt(c?.correct);
      return { score, total: 30 };
    }
    // s2
    const a = readJson(MB_KEYS.s2Song);
    const b = readJson(MB_KEYS.s2Movie);
    const c = readJson(MB_KEYS.s2MovieEmoji);
    const d = readJson(MB_KEYS.s2Silhouette);
    const e = readJson(MB_KEYS.s2TrueFalse);
    const f = readJson(MB_KEYS.s2Magic);
    const score = safeInt(a?.correct) + safeInt(b?.correct) + safeInt(c?.correct) + safeInt(d?.correct) + safeInt(e?.correct) + safeInt(f?.correct);
    return { score, total: 60 };
  }

  async function dataUrlToBlob(dataUrl) {
    const res = await fetch(dataUrl);
    return await res.blob();
  }

  async function uploadPublic(bucket, path, blob, contentType) {
    const client = await getAuthedClient();

    const { error } = await client.storage.from(bucket).upload(path, blob, {
      contentType: contentType || "application/octet-stream",
      upsert: true,
      cacheControl: "3600",
    });
    if (error) throw error;

    const { data } = client.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  async function invokeEdgeSubmit(payload) {
    const { url, key } = getConfig();
    const endpoint = url.replace(/\/$/, "") + "/functions/v1/mbq-submit";

    // Prefer an authenticated JWT if available (after anonymous sign-in),
    // otherwise fall back to the publishable key.
    let bearer = key;
    try {
      const client = await getAuthedClient();
      const { data } = await client.auth.getSession();
      if (data?.session?.access_token) bearer = data.session.access_token;
    } catch {}

    const doRequest = () => fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": key,
        "Authorization": "Bearer " + bearer,
      },
      body: JSON.stringify(payload),
    });

    let res = await doRequest();

    // Supabase function has a 10s throttle; retry once after a short wait.
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 11000));
      res = await doRequest();
    }

    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }

    if (!res.ok) {
      const msg = json?.error || json?.raw || ("HTTP " + res.status);
      throw new Error(msg);
    }
    return json;
  }

  /**
   * seasonId: "s1" | "s2"
   * championPngDataUrl: data:image/png;base64,...
   */
  async function syncFromLocal(seasonId, championPngDataUrl) {
    const deviceId = getOrCreateDeviceId();
    const profile = getProfile() || {};
    const nickname = String(profile?.name || "").trim();
    const avatarVal = profile?.avatar || null; // can be data URL OR URL

    if (!isNonEmpty(nickname)) {
      throw new Error("Nickname missing. Please set your profile name first.");
    }

    // Avatar upload (only if it's a data URL)
    let avatarUrl = null;
    if (isDataUrlImage(avatarVal)) {
      const blob = await dataUrlToBlob(avatarVal);
      avatarUrl = await uploadPublic("mbq-avatars", `avatars/${deviceId}.png`, blob, "image/png");

      // Replace saved avatar with URL (so we don't re-upload every time)
      try {
        const nextProfile = { ...profile, avatar: avatarUrl };
        localStorage.setItem(MB_KEYS.profile, JSON.stringify(nextProfile));
      } catch {}
    } else if (isNonEmpty(avatarVal)) {
      // If it's a relative path, make it absolute so leaderboard can load it from any subpage.
      avatarUrl = toAbsoluteUrlMaybe(String(avatarVal).trim());
    }

    // Champion upload (path must match Edge Function expectation)
    if (!isDataUrlImage(championPngDataUrl)) {
      throw new Error("Champion image is not a valid PNG data URL.");
    }
    const champBlob = await dataUrlToBlob(championPngDataUrl);
    const champPath = `${seasonId}/${deviceId}.png`; // s1/{id}.png or s2/{id}.png
    const champUrl = await uploadPublic("mbq-champions", champPath, champBlob, "image/png");

    const { score } = getSeasonScore(seasonId);
    const seasonNum = seasonId === "s1" ? 1 : 2;

    // Submit update via Edge Function
    const resp = await invokeEdgeSubmit({
      device_id: deviceId,
      nickname,
      avatar_url: avatarUrl,
      season: seasonNum,
      champ_url: champUrl,
      score,
    });

    return resp;
  }

  async function fetchTop(limit = 100) {
    const client = getClient();
    const { data, error } = await client
      .from("leaderboard")
      .select("device_id,nickname,avatar_url,champ_s1_url,champ_s2_url,champ_s1_score,champ_s2_score,champ_s1_total,champ_s2_total,total_score,updated_at")
      .order("total_score", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  window.MBQ_LEADERBOARD = {
    syncFromLocal,
    fetchTop,
    fetchLeaderboard: fetchTop,
    getDeviceId: getOrCreateDeviceId,
  };
})();