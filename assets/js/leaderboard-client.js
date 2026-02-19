// assets/js/leaderboard-client.js
// Upload avatar + champion images to Supabase Storage (public buckets)
// Submit leaderboard updates via Edge Function (no public DB write access in browser)

(function () {
  // Exported API functions (declared with var to avoid ReferenceError if bundling/caching goes weird)
  var syncFromLocal;
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

  // Back-compat alias (older code called getClient())
  function getClient() {
    return getClientSingleton();
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

  // Resolve repo-relative asset paths (e.g. "assets/uploadavatar.jpg") to an absolute URL.
  // IMPORTANT: when we're on a subpage like /leaderboard/, "assets/..." would resolve to
  // /leaderboard/assets/... (404). This helper auto-prefixes "../" for known subpages.
  function toAbsoluteUrlMaybe(u) {
    if (!isNonEmpty(u)) return null;
    const s = String(u).trim();
    if (isAbsoluteUrl(s) || s.startsWith("data:")) return s;
    try {
      // GitHub Pages: always resolve assets from "/<repo>/"
      const parts = (window.location.pathname || "").split("/").filter(Boolean);
      const repoBase = parts.length ? ("/" + parts[0] + "/") : "/";
      if (s.startsWith("assets/")) return new URL(repoBase + s, window.location.origin).href;
      if (s.startsWith("/")) return new URL(s, window.location.origin).href;
      return new URL(s, window.location.href).href;
    } catch {
      return s;
    }
  }

  const DEVICE_COOKIE = "mbq_device_id";
  const IDB_DB = "mbq";
  const IDB_STORE = "kv";
  const IDB_KEY = "mb_device_id";

  function getCookie(name) {
    const v = document.cookie || "";
    const parts = v.split(";").map(s => s.trim());
    for (const p of parts) {
      if (p.startsWith(name + "=")) return decodeURIComponent(p.slice(name.length + 1));
    }
    return "";
  }
  function setCookie(name, value) {
    // 10 years
    document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=315360000; Path=/; SameSite=Lax`;
  }

  function idbOpen() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_DB, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbGet(key) {
    try {
      const db = await idbOpen();
      return await new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE, "readonly");
        const store = tx.objectStore(IDB_STORE);
        const r = store.get(key);
        r.onsuccess = () => resolve(r.result || "");
        r.onerror = () => resolve("");
      });
    } catch {
      return "";
    }
  }

  async function idbSet(key, value) {
    try {
      const db = await idbOpen();
      await new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch {}
  }

  async function getOrCreateDeviceId() {
    // Prefer a previously-known device id from cookie/IDB/localStorage.
    // This keeps leaderboard identity stable across reloads and many "clear cache" flows.
    // If nothing is found, fall back to Supabase anonymous uid.
    let id = "";
    try { id = (localStorage.getItem(DEVICE_KEY) || "").trim(); } catch {}
    if (!id) id = (getCookie(DEVICE_COOKIE) || "").trim();
    if (!id) id = String(await idbGet(IDB_KEY) || "").trim();

    // Older dev builds sometimes stored a fixed test id (e.g. "dev_test") or fallback "dev_*".
    // Treat those as invalid so you don't get stuck with a non-unique identity or fail Storage ownership checks.
    const badId = String(id || "").trim().toLowerCase();
    if (badId === "dev_test" || badId === "devtest" || badId === "test" || badId.startsWith("dev_")) {
      id = "";
    }


    if (!id) {
      const client = await getAuthedClient();
      try {
        const { data, error } = await client.auth.getUser();
        if (error) console.warn("Supabase getUser error:", error);
        id = data?.user?.id || "";
      } catch (e) {
        console.warn("Supabase getUser exception:", e);
      }
      if (!id) {
        try {
          const { data } = await client.auth.getSession();
          id = data?.session?.user?.id || "";
        } catch {}
      }
    }
    // As a last-resort fallback (should be rare), keep old behavior, but this id will NOT have Storage ownership.
    if (!id) {
      id = (crypto?.randomUUID?.() || ("dev_" + Math.random().toString(36).slice(2) + Date.now()));
    }
    // Mirror into browser stores for convenience (non-authoritative).
    try { localStorage.setItem(DEVICE_KEY, id); } catch {}
    try { setCookie(DEVICE_COOKIE, id); } catch {}
    idbSet(IDB_KEY, id);
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
    // Some browsers/extensions can produce data URLs with whitespace/newlines,
    // which makes fetch("data:...") throw ERR_INVALID_URL. Handle both cases.
    try {
      const res = await fetch(dataUrl);
      return await res.blob();
    } catch (e) {
      const m = String(dataUrl || "").match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
      if (!m) throw e;
      const mime = m[1] || "application/octet-stream";
      const isB64 = !!m[2];
      let data = m[3] || "";
      // Remove whitespace/newlines
      data = data.replace(/\s+/g, "");
      if (isB64) {
        const bin = atob(data);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        return new Blob([arr], { type: mime });
      }
      return new Blob([decodeURIComponent(data)], { type: mime });
    }
  }

  async function fetchAsPngBlob(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const blob = await res.blob();
    if ((blob.type || "").includes("png")) return blob;
    // Convert jpg/webp/etc -> png to satisfy strict backend validators
    try {
      const bmp = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bmp.width;
      canvas.height = bmp.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bmp, 0, 0);
      return await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    } catch (e) {
      console.warn("fetchAsPngBlob convert failed:", e);
      return null;
    }
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

  async function uploadDeviceBoundAvatar(deviceId, blob) {
    // Upload to both locations for compatibility with different validators.
    // We return the URL that is most likely to satisfy strict checks.
    // (Many validators expect the public URL to end with `/<deviceId>.png`.)
    const legacyPath = `avatars/${deviceId}.png`;
    const strictPath = `${deviceId}.png`;

    // Best-effort: try both, but don't fail the whole flow if one path errors.
    let strictUrl = null;
    try { await uploadPublic("mbq-avatars", legacyPath, blob, "image/png"); } catch (e) {}
    try { strictUrl = await uploadPublic("mbq-avatars", strictPath, blob, "image/png"); } catch (e) {}

    // Fallback to legacy URL if strict upload failed.
    if (!strictUrl) {
      strictUrl = await uploadPublic("mbq-avatars", legacyPath, blob, "image/png");
    }
    return strictUrl;
  }



  // DEV/backup path: write directly to the `leaderboard` table.
  // This avoids Edge Function rate limits (429) in test environments.
  // If RLS blocks this, we'll fall back to the Edge Function.
  async function directUpsertSeasonRow({ deviceId, nickname, avatarUrl, seasonNum, champUrl, score }) {
    const client = getClient();

    // Try to fetch existing row so we don't wipe the other season fields.
    let existing = null;
    try {
      const { data } = await client
        .from('leaderboard')
        .select('device_id,nickname,avatar_url,champ_s1_url,champ_s2_url,champ_s1_score,champ_s2_score,champ_s1_total,champ_s2_total,total_score')
        .eq('device_id', deviceId)
        .maybeSingle();
      existing = data || null;
    } catch {}

    const row = Object.assign({}, existing || null, {
      device_id: deviceId,
      nickname: nickname,
      updated_at: new Date().toISOString(),
    });

    if (avatarUrl) row.avatar_url = avatarUrl;

    if (seasonNum === 1) {
      row.champ_s1_url = champUrl;
      row.champ_s1_score = score;
      row.champ_s1_total = 30;
    } else {
      row.champ_s2_url = champUrl;
      row.champ_s2_score = score;
      row.champ_s2_total = 60;
    }

    const s1 = Number(row.champ_s1_score || 0);
    const s2 = Number(row.champ_s2_score || 0);
    row.total_score = s1 + s2;

    const { error } = await client
      .from('leaderboard')
      .upsert(row, { onConflict: 'device_id' });

    if (error) throw error;
    return { ok: true, direct: true };
  }

  async function invokeEdgeSubmit(payload) {
    const { url, key } = getConfig();
    const endpoint = url.replace(/\/$/, "") + "/functions/v1/mbq-submit";

    // Edge Functions can be rate-limited. Avoid bursts by spacing requests.
    const now = Date.now();
    const minGapMs = 11000;
    const last = invokeEdgeSubmit._lastCallAt || 0;
    const waitMs = (last + minGapMs) - now;
    if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs));
    invokeEdgeSubmit._lastCallAt = Date.now();


    // Prefer an authenticated JWT if available (after anonymous sign-in).
    // If we don't have a real session token, omit Authorization entirely.
    // (Then the Edge Function can still accept the request, just without the extra auth.uid==device_id check.)
    let bearer = "";
    try {
      const client = await getAuthedClient();
      const { data } = await client.auth.getSession();
      if (data?.session?.access_token) bearer = data.session.access_token;
    } catch {}

    const doRequest = () => {
      const headers = {
        "Content-Type": "application/json",
        "apikey": key,
      };
      if (bearer) headers["Authorization"] = "Bearer " + bearer;
      return fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
    };

    let res = await doRequest();

    // Rate limit handling: retry a couple of times with backoff.
    // (Edge Functions often throttle burst requests.)
    let attempt = 0;
    while (res.status === 429 && attempt < 2) {
      const backoff = 12000 * (attempt + 1); // 12s, then 24s
      await new Promise((r) => setTimeout(r, backoff));
      res = await doRequest();
      attempt++;
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
  let _syncQueue = Promise.resolve();

  async function _syncFromLocalInner(seasonId, championPngDataUrl) {
    const deviceId = await getOrCreateDeviceId();
    const profile = getProfile() || {};

    // Persist device_id into the local profile so UI pages can reliably match "my row"
    // even if localStorage/cookies are cleared.
    try {
      const nextProfile = { ...profile, device_id: deviceId };
      localStorage.setItem(MB_KEYS.profile, JSON.stringify(nextProfile));
    } catch {}

    const nickname = String(profile?.name || "").trim();
    const avatarVal = profile?.avatar || null; // can be data URL OR URL

    if (!isNonEmpty(nickname)) {
      throw new Error("Nickname missing. Please set your profile name first.");
    }

    // Avatar handling:
    // - If it's a data URL => upload to Supabase Storage as avatars/{deviceId}.png
    // - If it's an URL:
    //    - If it already points to avatars/{deviceId} => keep
    //    - Otherwise try to fetch & re-upload under this deviceId (so Edge Function accepts it)
    let avatarUrl = null;
    if (isDataUrlImage(avatarVal)) {
      const blob = await dataUrlToBlob(avatarVal);
      avatarUrl = await uploadDeviceBoundAvatar(deviceId, blob);

      // Keep the original avatar (data URL) for in-app rendering (cards/canvas),
      // but store the uploaded public URL separately.
      try {
        const nextProfile = { ...profile, device_id: deviceId, avatar_url: avatarUrl };
        localStorage.setItem(MB_KEYS.profile, JSON.stringify(nextProfile));
      } catch {}
    } else if (isNonEmpty(avatarVal)) {
      const candidate = toAbsoluteUrlMaybe(String(avatarVal).trim());
      // Supabase public URLs may include either "/avatars/<id>" or encoded "avatars%2F<id>".
      // The Edge Function validator expects the avatar URL to be tied to the device_id,
      // so checking for the deviceId substring is the most robust.
      const looksDeviceBound = typeof candidate === 'string' && candidate.includes(deviceId);
      if (looksDeviceBound) {
        avatarUrl = candidate;
      } else {
        // Try to fetch the image and re-upload as the device-bound avatar.
        // (May fail due to CORS; if so we'll fall back to placeholder.)
        try {
          const blob = await fetchAsPngBlob(candidate);
          if (blob) {
            avatarUrl = await uploadDeviceBoundAvatar(deviceId, blob);
            try {
              const nextProfile = { ...profile, device_id: deviceId, avatar_url: avatarUrl };
              localStorage.setItem(MB_KEYS.profile, JSON.stringify(nextProfile));
            } catch {}
          }
        } catch {}
      }
    }


    // If we still don't have a valid device-bound avatar URL (e.g. placeholder/local path),
    // upload the default placeholder under this device id so the Edge Function accepts it.
    if (!avatarUrl) {
      try {
        // IMPORTANT: on /leaderboard/ page, "assets/..." resolves to "/leaderboard/assets/..." (404).
        // Always use repo-correct relative path.
        const blob = await fetchAsPngBlob(toAbsoluteUrlMaybe("assets/uploadavatar.jpg"));
        if (blob) {
          avatarUrl = await uploadDeviceBoundAvatar(deviceId, blob);
          try {
            const nextProfile = { ...profile, device_id: deviceId, avatar_url: avatarUrl };
            localStorage.setItem(MB_KEYS.profile, JSON.stringify(nextProfile));
          } catch {}
        }
      } catch (e) {
        console.warn("Placeholder avatar upload skipped:", e);
      }
    }

    // Champion upload (path must match Edge Function expectation)
    if (!isDataUrlImage(championPngDataUrl)) {
      throw new Error("Champion image is not a valid PNG data URL.");
    }
    const champBlob = await dataUrlToBlob(championPngDataUrl);
    const champPath = `${seasonId}/${deviceId}.png`; // s1/{id}.png or s2/{id}.png
    const champUrl = await uploadPublic("mbq-champions", champPath, champBlob, "image/png");

    // FIX: `seasonNum` was referenced but never defined, which stopped syncing entirely
    // (console: ReferenceError: seasonNum is not defined)
    const seasonNum = (seasonId === 's2') ? 2 : 1;

    const s1 = getSeasonScore("s1");
    const s2 = getSeasonScore("s2");
    const { score, total: season_total } = getSeasonScore(seasonId);
    const total_score = (s1?.score || 0) + (s2?.score || 0);

    const payload = {
      device_id: deviceId,
      nickname,
      season: seasonNum,
      champ_url: champUrl,
      score,
      season_total,
      score_s1: s1?.score || 0,
      score_s2: s2?.score || 0,
      total_score,
    };
    if (avatarUrl) payload.avatar_url = avatarUrl;

      // In production, do NOT allow direct DB writes from the browser (RLS will/should block it).
      // You can enable direct upsert only for private testing by setting: window.MBQ_ALLOW_DIRECT_UPSERT = true
      const allowDirectUpsert = !!window.MBQ_ALLOW_DIRECT_UPSERT;
      if (allowDirectUpsert) {
        try {
          const { ok } = await directUpsertSeasonRow({
            deviceId,
            nickname,
            avatarUrl: avatarUrl || null,
            seasonNum,
            champUrl,
            score,
          });
          if (ok) return { ok: true, via: "direct" };
        } catch (e) {
          console.warn("[MBQ] Direct leaderboard upsert failed; falling back to Edge Function:", e);
        }
      }

      const resp = await invokeEdgeSubmit(payload);
    return resp;
  }

  // Queue sync calls to avoid hitting Edge Function rate limits (429)
  syncFromLocal = function(seasonId, championPngDataUrl) {
    _syncQueue = _syncQueue.then(() => _syncFromLocalInner(seasonId, championPngDataUrl));
    return _syncQueue;
  };

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