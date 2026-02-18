const MB_KEYS = {
  profile: "mb_profile",
  doneSong: "mb_done_song",
  doneMovie: "mb_done_movie",
  doneMagic: "mb_done_magicblock",
  resSong: "mb_result_song",
  resMovie: "mb_result_movie",
  resMagic: "mb_result_magicblock",
  champId: "mb_champ_id",
  champPng: "mb_champ_png",      // stores SMALL preview jpeg
  champPngUpload: "mb_champ_png_upload", // stores PNG (scaled) for leaderboard sync
  champReady: "mb_champ_ready",
};

function safeJSONParse(v, fallback = null) {
  try { return JSON.parse(v); } catch { return fallback; }
}
function getProfile() {
  return safeJSONParse(localStorage.getItem(MB_KEYS.profile), null);
}

function forcePlayAll(selector) {
  const vids = document.querySelectorAll(selector);
  if (!vids.length) return;
  const tryPlay = () => vids.forEach(v => v.play().catch(() => {}));
  tryPlay();
  window.addEventListener("click", tryPlay, { once: true });
  window.addEventListener("touchstart", tryPlay, { once: true });
}
forcePlayAll(".bg__video");
forcePlayAll(".brand__logo");

// Topbar navigation
(() => {
  // ✅ Dropdown Season menu (hover on desktop, tap/click on mobile)
  const seasonMenu = document.getElementById("seasonMenu");
  if (seasonMenu){
    const btn = seasonMenu.querySelector("button");
    btn?.addEventListener("click", (e) => {
      e.preventDefault();
      seasonMenu.classList.toggle("isOpen");
    });
    seasonMenu.querySelectorAll("a").forEach(a => a.addEventListener("click", () => seasonMenu.classList.remove("isOpen")));
    document.addEventListener("click", (e) => {
      if (!seasonMenu.contains(e.target)) seasonMenu.classList.remove("isOpen");
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") seasonMenu.classList.remove("isOpen");
    });
  }

  const achievementsBtn = document.getElementById("achievementsBtn");
  if (achievementsBtn) achievementsBtn.addEventListener("click", () => (location.href = "index.html#achievements"));
})();

// ===== Top profile pill =====
function renderTopProfile() {
  const pill = document.getElementById("profilePill");
  if (!pill) return;

  const img = pill.querySelector("img");
  const nameEl = pill.querySelector("[data-profile-name]");
  const hintEl = pill.querySelector("[data-profile-hint]");

  const p = getProfile();
  if (!p) {
    if (img) img.src = "";
    if (nameEl) nameEl.textContent = "No profile";
    if (hintEl) hintEl.textContent = "Go Home";
    pill.addEventListener("click", () => (location.href = "index.html"));
    return;
  }

  if (img) img.src = p.avatar || "";
  if (nameEl) nameEl.textContent = p.name || "Player";
  if (hintEl) hintEl.textContent = "Edit on Home";
  pill.addEventListener("click", () => (location.href = "index.html"));
}
renderTopProfile();

// ===== DOM =====
const sumName = document.getElementById("sumName");
const sumDone = document.getElementById("sumDone");
const sumTotal = document.getElementById("sumTotal");
const sumCorrect = document.getElementById("sumCorrect");
const sumAcc = document.getElementById("sumAcc");

const genBtn = document.getElementById("genChampBtn");
const cardZone = document.getElementById("cardZone");
const cardCanvas = document.getElementById("cardCanvas");
const dlBtn = document.getElementById("dlBtn");

function isDone(k) { return localStorage.getItem(k) === "1"; }
function loadResult(key) { return safeJSONParse(localStorage.getItem(key), null); }

// ===== Tier logic =====
function getTierByCorrect(correct) {
  if (correct >= 25) return "gold";
  if (correct >= 15) return "silver";
  return "bronze";
}

const TIER_THEME = {
  gold:   { label: "GOLD",   base: "#d2a24d", dark: "#b37f2f" },
  silver: { label: "SILVER", base: "#bdbdbd", dark: "#8f8f8f" },
  bronze: { label: "BRONZE", base: "#9b561e", dark: "#6e3610" },
};

// ===== ID (keeps same after first gen) =====
function randomIdPart(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";

  if (window.crypto?.getRandomValues) {
    const buf = new Uint8Array(len);
    crypto.getRandomValues(buf);
    for (let i = 0; i < len; i++) out += chars[buf[i] % chars.length];
    return out;
  }

  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function getOrCreateChampionId() {
  const existing = localStorage.getItem(MB_KEYS.champId);
  if (existing) return existing;

  const id = `MB-CHAMP-${randomIdPart(6)}`;
  try { localStorage.setItem(MB_KEYS.champId, id); } catch {}
  return id;
}

function computeSummary() {
  const p = getProfile();
  if (sumName) sumName.textContent = p?.name || "Player";

  const doneFlags = [
    isDone(MB_KEYS.doneSong),
    isDone(MB_KEYS.doneMovie),
    isDone(MB_KEYS.doneMagic),
  ];
  const doneCount = doneFlags.filter(Boolean).length;
  if (sumDone) sumDone.textContent = `${doneCount} / 3`;

  const r1 = loadResult(MB_KEYS.resSong);
  const r2 = loadResult(MB_KEYS.resMovie);
  const r3 = loadResult(MB_KEYS.resMagic);

  const results = [r1, r2, r3].filter(Boolean);
  const total = results.reduce((a, r) => a + (r.total || 0), 0);
  const correct = results.reduce((a, r) => a + (r.correct || 0), 0);
  const acc = total ? Math.round((correct / total) * 100) : 0;

  if (sumTotal) sumTotal.textContent = String(total);
  if (sumCorrect) sumCorrect.textContent = String(correct);
  if (sumAcc) sumAcc.textContent = `${acc}%`;

  const unlocked = doneCount === 3 && results.length === 3 && !!p;

  const tier = getTierByCorrect(correct);
  const champId = getOrCreateChampionId();

  return { unlocked, total, correct, acc, profile: p, tier, champId };
}

/* =========================
   ✅ RESTORE PREVIEW (NO UPSCALE)
========================= */
async function restoreChampionIfExists() {
  const prev = localStorage.getItem(MB_KEYS.champPng);
  if (!prev || !prev.startsWith("data:image/") || !cardCanvas) return false;

  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = prev;
    });

    // ✅ canvas = preview size (avoid blurry upscale)
    cardCanvas.width = img.naturalWidth || img.width;
    cardCanvas.height = img.naturalHeight || img.height;

    const ctx = cardCanvas.getContext("2d");
    ctx.clearRect(0, 0, cardCanvas.width, cardCanvas.height);
    ctx.drawImage(img, 0, 0);

    cardZone?.classList.add("isOpen");
    if (dlBtn) dlBtn.disabled = false;

    if (genBtn) genBtn.textContent = "Regenerate Champion Card";
    return true;
  } catch (e) {
    console.warn("restoreChampionIfExists failed:", e);
    return false;
  }
}

/* =========================
   ✅ SAVE SMALL PREVIEW (JPEG)
========================= */
function saveChampionPreview() {
  if (!cardCanvas) return;
  try {
    const preview = exportPreviewDataURL(cardCanvas, 520, 0.85);
    const uploadPng = exportPreviewPNG(cardCanvas, 1400);
    if (preview && preview.startsWith("data:image/")) {
      localStorage.setItem(MB_KEYS.champPng, preview);
      // NOTE: do NOT store upload PNG in localStorage (too big / quota issues)
localStorage.setItem(MB_KEYS.champReady, "1");
    }
  } catch (e) {
    console.warn("preview save failed:", e);
    try { localStorage.removeItem(MB_KEYS.champPng); } catch {}console.warn("Storage quota hit while saving preview. Skipping local preview persistence.");
}
}

// ===== Actions =====
genBtn?.addEventListener("click", async () => {
  const s = computeSummary();
  if (!s.unlocked) return;

  // draw full-res into canvas
  await drawChampionCard(s);

  // show + enable download
  cardZone?.classList.add("isOpen");
  cardZone?.scrollIntoView({ behavior: "smooth", block: "start" });
  if (dlBtn) dlBtn.disabled = false;

  // save small preview
  saveChampionPreview();

  // --- Public leaderboard sync (Supabase) ---
  // Upload a reasonably-sized image (not full-res canvas) to keep file size sane.
  try {
    const uploadDataUrl = exportPreviewPNG(cardCanvas, 1400);
    if (window.MBQ_LEADERBOARD?.syncFromLocal) {
      await window.MBQ_LEADERBOARD.syncFromLocal('s1', uploadDataUrl);
    }
  } catch (e) {
    console.warn('Leaderboard sync failed (S1):', e);
  }

  if (genBtn) genBtn.textContent = "Regenerate Champion Card";
});

dlBtn?.addEventListener("click", async () => {
  if (!cardCanvas) return;

  const s = computeSummary();
  if (!s.unlocked) return;

  // ✅ always render full-res before download (sharp PNG)
  await drawChampionCard(s);

  const a = document.createElement("a");
  a.download = "magicblock-champion-card.png";
  a.href = cardCanvas.toDataURL("image/png");
  a.click();
});

// ===== Canvas assets cache =====
let _noisePattern = null;
let _logoFrame = null;

// ===== DRAW =====
async function drawChampionCard(summary) {
  if (!cardCanvas) return;

  // Landscape card
  const W = 1400;
  const H = 800;

  if (cardCanvas.width !== W) cardCanvas.width = W;
  if (cardCanvas.height !== H) cardCanvas.height = H;

  const ctx = cardCanvas.getContext("2d");
  ctx.clearRect(0, 0, W, H);

  const theme = TIER_THEME[summary.tier] || TIER_THEME.bronze;
  const pad = 70;

  // --- background gradient by tier ---
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, theme.base);
  g.addColorStop(1, theme.dark);
  ctx.fillStyle = g;
  roundRect(ctx, 0, 0, W, H, 80, true, false);

  // soft highlight
  const hi = ctx.createRadialGradient(W * 0.50, H * 0.35, 120, W * 0.55, H * 0.55, H * 0.95);
  hi.addColorStop(0, "rgba(255,255,255,0.20)");
  hi.addColorStop(1, "rgba(0,0,0,0.14)");
  ctx.fillStyle = hi;
  roundRect(ctx, 0, 0, W, H, 80, true, false);

  // mesh waves
  ctx.save();
  roundedRectPath(ctx, 0, 0, W, H, 80);
  ctx.clip();
  drawMesh(ctx, W, H, 0.14);
  ctx.restore();

  // grain
  ensureNoisePattern(ctx);
  ctx.save();
  ctx.globalAlpha = 0.09;
  ctx.fillStyle = _noisePattern;
  roundRect(ctx, 0, 0, W, H, 80, true, false);
  ctx.restore();

  // ===== stronger STATIC shine (for PNG) =====
  ctx.save();
  roundedRectPath(ctx, 0, 0, W, H, 80);
  ctx.clip();

  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.55;

  const shine = ctx.createLinearGradient(-W * 0.4, H * 0.15, W * 1.4, H * 0.85);
  shine.addColorStop(0.00, "rgba(255,255,255,0.00)");
  shine.addColorStop(0.40, "rgba(255,255,255,0.00)");
  shine.addColorStop(0.50, "rgba(255,255,255,0.18)");
  shine.addColorStop(0.56, "rgba(255,255,255,0.42)");
  shine.addColorStop(0.62, "rgba(255,255,255,0.14)");
  shine.addColorStop(0.70, "rgba(255,255,255,0.00)");
  shine.addColorStop(1.00, "rgba(255,255,255,0.00)");
  ctx.fillStyle = shine;
  ctx.fillRect(0, 0, W, H);

  ctx.globalAlpha = 0.26;
  const bloom = ctx.createRadialGradient(W * 0.20, H * 0.15, 40, W * 0.20, H * 0.15, H * 0.62);
  bloom.addColorStop(0, "rgba(255,255,255,0.28)");
  bloom.addColorStop(1, "rgba(255,255,255,0.00)");
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, W, H);

  ctx.restore();
  ctx.globalCompositeOperation = "source-over";

  // borders
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  roundRect(ctx, 0, 0, W, H, 80, false, true);

  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  roundRect(ctx, 6, 6, W - 12, H - 12, 76, false, true);

  // ===== HEADER =====
  await drawLogo(ctx, pad, pad - 38, 310, 122, 0.98);

  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "900 56px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.textAlign = "center";
  applyTextShadow(ctx, 0.35, 10, 0, 3);
  ctx.fillText("Champion Card", W / 2, pad + 8);
  clearTextShadow(ctx);
  ctx.restore();

  drawStatusPill(ctx, W - pad - 220, pad - 44, 220, 62, (TIER_THEME[summary.tier] || TIER_THEME.bronze).label);

  // ===== AVATAR =====
  const ax = pad;
  const ay = 210;
  const as = 360;
  const ar = 78;

  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  roundRect(ctx, ax, ay, as, as, ar, false, true);

  ctx.fillStyle = "rgba(255,255,255,0.10)";
  roundRect(ctx, ax + 8, ay + 8, as - 16, as - 16, ar - 10, true, false);

  const avatarSrc = summary.profile?.avatar || "";
  await drawAvatarRounded(ctx, avatarSrc, ax + 12, ay + 12, as - 24, as - 24, ar - 14);

  // ===== TEXT =====
  const tx = 520;
  const name = (summary.profile?.name || "Player").trim();
  const scoreText = `${summary.correct} / ${summary.total}`;

  let y = 260;
  drawLabelValue(ctx, tx, y, "Your Name", name);
  y += 195;

  drawDivider(ctx, tx, y - 40, W - pad - tx);
  drawLabelValue(ctx, tx, y, "Total Score", scoreText);
  y += 195;

  drawDivider(ctx, tx, y - 40, W - pad - tx);
  drawIdTable(ctx, tx, y - 12, 520, 84, summary.champId);

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.40)";
  ctx.font = "800 30px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(`Accuracy: ${summary.acc}%`, pad, H - 60);
  ctx.restore();
}

function drawStatusPill(ctx, x, y, w, h, label) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 28, true, true);

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "950 34px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  applyTextShadow(ctx, 0.28, 10, 0, 2);
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  clearTextShadow(ctx);

  ctx.restore();
}

function drawIdTable(ctx, x, y, w, h, id) {
  ctx.save();

  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 26, true, true);

  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = "800 30px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("ID:", x + 22, y + 52);

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "950 34px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  applyTextShadow(ctx, 0.22, 8, 0, 2);
  ctx.fillText(id, x + 70, y + 52);
  clearTextShadow(ctx);

  ctx.restore();
}

function drawLabelValue(ctx, x, y, label, value) {
  ctx.save();

  ctx.fillStyle = "rgba(255,255,255,0.76)";
  ctx.font = "800 38px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  applyTextShadow(ctx, 0.22, 8, 0, 2);
  ctx.fillText(label, x, y);

  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "950 72px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  applyTextShadow(ctx, 0.35, 10, 0, 3);
  ctx.fillText(value, x, y + 90);

  clearTextShadow(ctx);
  ctx.restore();
}

function drawDivider(ctx, x, y, w) {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();
  ctx.restore();
}

function applyTextShadow(ctx, alpha, blur, ox, oy) {
  ctx.shadowColor = `rgba(0,0,0,${alpha})`;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetX = ox;
  ctx.shadowOffsetY = oy;
}
function clearTextShadow(ctx) {
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

// ===== Logo drawing =====
async function drawLogo(ctx, x, y, w, h, opacity = 0.95) {
  try {
    if (!_logoFrame) {
      _logoFrame = await loadVideoFrame("../../assets/logo.webm", 0.0);
    }
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.drawImage(_logoFrame, x, y, w, h);
    ctx.restore();
  } catch {}
}

function loadVideoFrame(src, time = 0) {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.src = src;

    const clean = () => {
      v.onloadeddata = null;
      v.onseeked = null;
      v.onerror = null;
    };

    v.onerror = () => { clean(); reject(new Error("video load failed")); };

    v.onloadeddata = () => {
      try { v.currentTime = time; } catch {}
      v.onseeked = () => { clean(); resolve(v); };
      setTimeout(() => { clean(); resolve(v); }, 150);
    };
  });
}

// ===== Helpers =====
function roundedRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  roundedRectPath(ctx, x, y, w, h, r);
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function drawMesh(ctx, W, H, alpha = 0.12) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 1;

  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  const rows = 22;
  for (let i = 0; i < rows; i++) {
    const baseY = (H * 0.18) + i * (H * 0.032);
    ctx.beginPath();
    for (let x = -30; x <= W + 30; x += 18) {
      const t = x / W;
      const wobble =
        Math.sin(t * Math.PI * 2 + i * 0.22) * 14 +
        Math.sin(t * Math.PI * 6 + i * 0.12) * 5;
      const y = baseY + wobble;
      if (x <= -30) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.globalAlpha = alpha * 0.55;
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  const cols = 16;
  for (let i = 0; i < cols; i++) {
    const baseX = (W * 0.08) + i * (W * 0.055);
    ctx.beginPath();
    for (let y = -30; y <= H + 30; y += 18) {
      const t = y / H;
      const wobble =
        Math.sin(t * Math.PI * 2 + i * 0.28) * 12 +
        Math.sin(t * Math.PI * 5 + i * 0.14) * 4;
      const x = baseX + wobble;
      if (y <= -30) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.restore();
}

function ensureNoisePattern(ctx) {
  if (_noisePattern) return;

  const n = document.createElement("canvas");
  n.width = 160;
  n.height = 160;
  const nctx = n.getContext("2d");
  const img = nctx.createImageData(n.width, n.height);

  for (let i = 0; i < img.data.length; i += 4) {
    const v = (Math.random() * 255) | 0;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  nctx.putImageData(img, 0, 0);

  _noisePattern = ctx.createPattern(n, "repeat");
}

async function drawAvatarRounded(ctx, src, x, y, w, h, r) {
  ctx.save();
  roundedRectPath(ctx, x, y, w, h, r);
  ctx.clip();

  // Accept both data URLs and normal URLs (e.g. Supabase public URLs).
  // If loading fails, fall back to placeholder.
  if (!src) {
    src = "";
  }

  try {
    const img = await loadImage(src);
    ctx.filter = "none";
    drawCover(ctx, img, x, y, w, h);
  } catch {
    try {
      const fallback = await loadImage("../../assets/uploadavatar.jpg");
      ctx.filter = "blur(7px)";
      drawCover(ctx, fallback, x, y, w, h);
      ctx.filter = "none";
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(x, y, w, h);
    } catch {
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(x, y, w, h);
    }
  }
  ctx.restore();
}

function drawCover(ctx, img, x, y, w, h) {
  const iw = img.width;
  const ih = img.height;
  const ir = iw / ih;
  const rr = w / h;

  let dw, dh, dx, dy;
  if (ir > rr) {
    dh = h;
    dw = h * ir;
    dx = x - (dw - w) / 2;
    dy = y;
  } else {
    dw = w;
    dh = w / ir;
    dx = x;
    dy = y - (dh - h) / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Helps when avatar is hosted on another domain (Supabase public URL)
    if (typeof src === "string" && src && !src.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function exportPreviewDataURL(srcCanvas, maxW = 520, quality = 0.85) {
  const w = srcCanvas.width;
  const h = srcCanvas.height;
  const scale = Math.min(1, maxW / w);

  const tw = Math.round(w * scale);
  const th = Math.round(h * scale);

  const t = document.createElement("canvas");
  t.width = tw;
  t.height = th;

  const ctx = t.getContext("2d");
  ctx.drawImage(srcCanvas, 0, 0, tw, th);

  return t.toDataURL("image/jpeg", quality);
}

// PNG export for leaderboard sync (Supabase client expects PNG)
function exportPreviewPNG(srcCanvas, maxW = 1400) {
  const w = srcCanvas.width;
  const h = srcCanvas.height;
  const scale = Math.min(1, maxW / w);

  const tw = Math.round(w * scale);
  const th = Math.round(h * scale);

  const t = document.createElement("canvas");
  t.width = tw;
  t.height = th;

  const ctx = t.getContext("2d");
  ctx.drawImage(srcCanvas, 0, 0, tw, th);
  return t.toDataURL("image/png");
}

// ===== INIT =====
(async () => {
  const s = computeSummary();

  if (dlBtn) dlBtn.disabled = true;
  if (genBtn) {
    genBtn.disabled = !s.unlocked;
    genBtn.textContent = s.unlocked ? "Generate Champion Card" : "Locked (complete all quizzes)";
  }

  const restored = await restoreChampionIfExists();
  if (restored) {
    const s2 = computeSummary();
    if (genBtn) genBtn.disabled = !s2.unlocked;
  }
})();
 
