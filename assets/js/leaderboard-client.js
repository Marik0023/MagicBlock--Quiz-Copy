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
    if (isAbsoluteUrl(u) || u.startsWith('data:')) return u;
    try {
      const p = (window.location && window.location.pathname) ? window.location.pathname : "";
      const onSubpage = p.includes("/leaderboard/") || p.includes("/seasons/") || p.includes("/achievements/");
      const fixed = (onSubpage && u.startsWith("assets/")) ? ("../" + u) : u;
      return new URL(fixed, window.location.href).href;
    } catch {
      return u;
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
    // Best variant: use Supabase anonymous auth uid as our stable id.
    // This prevents easy spoofing and keeps Storage ownership aligned with RLS.
    const client = await getAuthedClient();
    let id = "";
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
    const res = await fetch(dataUrl);
    return await res.blob();
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
  syncFromLocal = async function(seasonId, championPngDataUrl) {
    const deviceId = await getOrCreateDeviceId();
    const profile = getProfile() || {};
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
      avatarUrl = await uploadPublic("mbq-avatars", `avatars/${deviceId}.png`, blob, "image/png");

      // Replace saved avatar with URL (so we don't re-upload every time)
      try {
        const nextProfile = { ...profile, avatar: avatarUrl };
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
            avatarUrl = await uploadPublic("mbq-avatars", `avatars/${deviceId}.png`, blob, "image/png");
            try {
              const nextProfile = { ...profile, avatar: avatarUrl };
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
        const blob = await fetchAsPngBlob("../assets/uploadavatar.jpg");
        if (blob) {
          avatarUrl = await uploadPublic("mbq-avatars", `avatars/${deviceId}.png`, blob, "image/png");
          try {
            const nextProfile = { ...profile, avatar: avatarUrl };
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

    const { score } = getSeasonScore(seasonId);
    const seasonNum = seasonId === "s1" ? 1 : 2;

    // Submit update via Edge Function
    const payload = {
      device_id: deviceId,
      nickname,
      season: seasonNum,
      champ_url: champUrl,
      score,
    };
    if (typeof avatarUrl === "string" && avatarUrl.length) {
      payload.avatar_url = avatarUrl;
    }

    const resp = await invokeEdgeSubmit(payload);

    return resp;
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