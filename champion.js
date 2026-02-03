// champion.js — premium title + tier badge + serial id + stronger animated metallic shine

const MB_KEYS = {
  profile: "mb_profile",
  doneSong: "mb_done_song",
  doneMovie: "mb_done_movie",
  doneMagic: "mb_done_magicblock",
  resSong: "mb_result_song",
  resMovie: "mb_result_movie",
  resMagic: "mb_result_magicblock",
};

const MB_SERIAL_KEY = "mb_champion_serial";

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

// GOLD >= 25, SILVER 15–24, BRONZE < 15
function getTierByCorrect(correct) {
  if (correct >= 25) return "gold";
  if (correct >= 15) return "silver";
  return "bronze";
}

const TIER_THEME = {
  gold:   { label: "GOLD",   base: "#d2a24d", dark: "#7f5619" },
  silver: { label: "SILVER", base: "#bdbdbd", dark: "#5f5f5f" },
  bronze: { label: "BRONZE", base: "#9b561e", dark: "#4f2710" },
};

function getOrCreateSerial() {
  const existing = localStorage.getItem(MB_SERIAL_KEY);
  if (existing) return existing;

  // 6 chars base36 from crypto if possible
  let n = 0;
  try {
    const u = new Uint32Array(1);
    crypto.getRandomValues(u);
    n = u[0];
  } catch {
    n = Math.floor(Math.random() * 0xffffffff);
  }
  const code = n.toString(36).toUpperCase().padStart(6, "0").slice(0, 6);
  const serial = `MB-CHAMP-${code}`;
  localStorage.setItem(MB_SERIAL_KEY, serial);
  return serial;
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
  if (genBtn) genBtn.disabled = !unlocked;

  const tier = getTierByCorrect(correct);
  const serial = getOrCreateSerial();
  return { unlocked, total, correct, acc, profile: p, tier, serial };
}

// ===== download =====
dlBtn?.addEventListener("click", () => {
  if (!cardCanvas) return;
  const a = document.createElement("a");
  a.download = "magicblock-champion-card.png";
  a.href = cardCanvas.toDataURL("image/png");
  a.click();
});

// ====== animation state ======
let _noisePattern = null;
let _logoFrame = null;

let _baseCanvas = null;
let _baseCtx = null;

let _raf = 0;
let _startT = 0;
let _lastSummaryKey = "";

// ===== generate =====
genBtn?.addEventListener("click", async () => {
  const s = computeSummary();
  if (!s.unlocked) return;

  if (cardZone) {
    cardZone.classList.remove("isOpen");
    void cardZone.offsetWidth;
    cardZone.classList.add("isOpen");
  }

  await drawChampionCardAnimated(s);
  cardZone?.scrollIntoView({ behavior: "smooth", block: "start" });
});

// ====== MAIN DRAW (animated shimmer) ======
async function drawChampionCardAnimated(summary) {
  if (!cardCanvas) return;

  const W = 1400;
  const H = 800;

  if (cardCanvas.width !== W) cardCanvas.width = W;
  if (cardCanvas.height !== H) cardCanvas.height = H;

  const key = makeSummaryKey(summary);
  if (key !== _lastSummaryKey) {
    _lastSummaryKey = key;
    ensureBaseCanvas(W, H);
    await renderBaseCard(_baseCtx, W, H, summary);
  }

  if (_raf) cancelAnimationFrame(_raf);
  _startT = performance.now();

  const ctx = cardCanvas.getContext("2d");

  const loop = (t) => {
    if (cardZone && !cardZone.classList.contains("isOpen")) {
      _raf = 0;
      return;
    }

    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(_baseCanvas, 0, 0);

    // stronger multi-layer sheen
    drawAnimatedSheen(ctx, W, H, summary, t - _startT);

    _raf = requestAnimationFrame(loop);
  };

  _raf = requestAnimationFrame(loop);
}

function makeSummaryKey(s) {
  return [
    s.tier,
    s.correct,
    s.total,
    s.acc,
    s.serial,
    (s.profile?.name || ""),
    (s.profile?.avatar || "").slice(0, 32)
  ].join("|");
}

function ensureBaseCanvas(W, H) {
  if (_baseCanvas && _baseCanvas.width === W && _baseCanvas.height === H) return;
  _baseCanvas = document.createElement("canvas");
  _baseCanvas.width = W;
  _baseCanvas.height = H;
  _baseCtx = _baseCanvas.getContext("2d");
}

// ====== render STATIC base card into offscreen ======
async function renderBaseCard(ctx, W, H, summary) {
  ctx.clearRect(0, 0, W, H);

  const theme = TIER_THEME[summary.tier] || TIER_THEME.bronze;

  // card bg gradient
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, theme.base);
  g.addColorStop(1, theme.dark);
  ctx.fillStyle = g;
  roundRect(ctx, 0, 0, W, H, 80, true, false);

  // soft highlight
  const hi = ctx.createRadialGradient(W * 0.45, H * 0.22, 120, W * 0.55, H * 0.55, H * 0.95);
  hi.addColorStop(0, "rgba(255,255,255,0.16)");
  hi.addColorStop(1, "rgba(0,0,0,0.14)");
  ctx.fillStyle = hi;
  roundRect(ctx, 0, 0, W, H, 80, true, false);

  // mesh
  ctx.save();
  roundedRectPath(ctx, 0, 0, W, H, 80);
  ctx.clip();
  drawMesh(ctx, W, H, 0.12);
  ctx.restore();

  // grain
  ensureNoisePattern(ctx);
  ctx.save();
  ctx.globalAlpha = 0.085;
  ctx.fillStyle = _noisePattern;
  roundRect(ctx, 0, 0, W, H, 80, true, false);
  ctx.restore();

  // borders
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  roundRect(ctx, 0, 0, W, H, 80, false, true);

  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  roundRect(ctx, 6, 6, W - 12, H - 12, 76, false, true);

  const pad = 70;

  // LEFT logo (bigger)
  await drawLogo(ctx, pad, pad - 40, 300, 118, 0.95);

  // ===== premium title (center) =====
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = "rgba(255,255,255,0.70)";
  ctx.font = "800 18px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  applyTextShadow(ctx, 0.20, 6, 0, 2);
  ctx.fillText("MAGICBLOCK • ACHIEVEMENT", W / 2, pad - 2);

  ctx.fillStyle = "rgba(255,255,255,0.94)";
  ctx.font = "950 64px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  applyTextShadow(ctx, 0.35, 12, 0, 3);
  ctx.fillText("CHAMPION", W / 2, pad + 56);

  ctx.fillStyle = "rgba(255,255,255,0.86)";
  ctx.font = "900 40px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  applyTextShadow(ctx, 0.28, 10, 0, 3);
  ctx.fillText("CARD", W / 2, pad + 98);

  clearTextShadow(ctx);
  ctx.restore();

  // underline
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.20)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 140, pad + 118);
  ctx.lineTo(W / 2 + 140, pad + 118);
  ctx.stroke();
  ctx.restore();

  // tier badge (top-right)
  const badgeX = W - pad - 260;
  const badgeY = pad - 18;
  drawTierBadge(ctx, badgeX, badgeY, 240, 74, theme.label);

  // Serial under badge
  drawSerial(ctx, badgeX + 6, badgeY + 92, summary.serial);

  // avatar block
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

  // text block
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

  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.80)";
  ctx.font = "750 42px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  applyTextShadow(ctx, 0.25, 8, 0, 2);
  ctx.fillText("Card status:", tx, y);

  ctx.fillStyle = "rgba(255,255,255,0.96)";
  ctx.font = "950 62px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  applyTextShadow(ctx, 0.35, 10, 0, 3);
  ctx.fillText(theme.label, tx + 300, y);

  clearTextShadow(ctx);
  ctx.restore();

  // bottom-left
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.40)";
  ctx.font = "800 30px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(`Accuracy: ${summary.acc}%`, pad, H - 60);
  ctx.restore();
}

function drawTierBadge(ctx, x, y, w, h, label) {
  ctx.save();

  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 999, true, true);

  ctx.globalAlpha = 0.70;
  const gloss = ctx.createLinearGradient(x, y, x, y + h);
  gloss.addColorStop(0, "rgba(255,255,255,0.22)");
  gloss.addColorStop(0.45, "rgba(255,255,255,0.08)");
  gloss.addColorStop(1, "rgba(255,255,255,0.00)");
  ctx.fillStyle = gloss;
  roundRect(ctx, x + 4, y + 4, w - 8, h - 8, 999, true, false);
  ctx.globalAlpha = 1;

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "950 30px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  applyTextShadow(ctx, 0.35, 10, 0, 2);
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  clearTextShadow(ctx);

  ctx.restore();
}

function drawSerial(ctx, x, y, serial) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.26)";
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, 228, 44, 999, true, true);

  ctx.fillStyle = "rgba(255,255,255,0.80)";
  ctx.font = "800 18px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  applyTextShadow(ctx, 0.30, 8, 0, 2);
  ctx.fillText(`ID: ${serial}`, x + 16, y + 22);
  clearTextShadow(ctx);
  ctx.restore();
}

// ====== STRONGER animated sheen (3 layers) ======
function drawAnimatedSheen(ctx, W, H, summary, dt) {
  const theme = TIER_THEME[summary.tier] || TIER_THEME.bronze;

  ctx.save();
  roundedRectPath(ctx, 0, 0, W, H, 80);
  ctx.clip();

  // stronger pulsing
  const pulse = 0.14 + 0.08 * Math.sin(dt / 900);

  // 1) wide slow band
  {
    const speed = 5200;
    const p = (dt % speed) / speed;
    const cx = -W * 0.7 + p * (W * 2.4);

    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.55 * pulse;

    const band = ctx.createLinearGradient(cx - 420, H * 0.12, cx + 420, H * 0.88);
    band.addColorStop(0.00, "rgba(255,255,255,0.00)");
    band.addColorStop(0.40, "rgba(255,255,255,0.00)");
    band.addColorStop(0.50, "rgba(255,255,255,0.22)");
    band.addColorStop(0.58, "rgba(255,255,255,0.08)");
    band.addColorStop(0.72, "rgba(255,255,255,0.00)");
    band.addColorStop(1.00, "rgba(255,255,255,0.00)");
    ctx.fillStyle = band;
    ctx.fillRect(0, 0, W, H);
  }

  // 2) narrow fast glint (sharper)
  {
    const speed = 2800;
    const p = (dt % speed) / speed;
    const cx = -W * 0.5 + p * (W * 2.0);

    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.45 * pulse;

    const glint = ctx.createLinearGradient(cx - 140, H * 0.22, cx + 140, H * 0.78);
    glint.addColorStop(0.00, "rgba(255,255,255,0.00)");
    glint.addColorStop(0.44, "rgba(255,255,255,0.00)");
    glint.addColorStop(0.50, "rgba(255,255,255,0.34)");
    glint.addColorStop(0.54, "rgba(255,255,255,0.10)");
    glint.addColorStop(0.66, "rgba(255,255,255,0.00)");
    glint.addColorStop(1.00, "rgba(255,255,255,0.00)");
    ctx.fillStyle = glint;
    ctx.fillRect(0, 0, W, H);
  }

  // 3) soft corner bloom + tiny sparkles
  {
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.22 * pulse;

    const sx = W * (0.10 + 0.80 * (0.5 + 0.5 * Math.sin(dt / 820)));
    const sy = H * (0.14 + 0.24 * (0.5 + 0.5 * Math.cos(dt / 1100)));

    const bloom = ctx.createRadialGradient(sx, sy, 10, sx, sy, H * 0.65);
    bloom.addColorStop(0, "rgba(255,255,255,0.22)");
    bloom.addColorStop(1, "rgba(255,255,255,0.00)");
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, W, H);

    // sparkles
    ctx.globalAlpha = 0.10 * pulse;
    for (let i = 0; i < 5; i++) {
      const t = dt / 1000 + i * 1.7;
      const px = W * (0.22 + 0.62 * (0.5 + 0.5 * Math.sin(t * 1.3)));
      const py = H * (0.20 + 0.55 * (0.5 + 0.5 * Math.cos(t * 1.1)));
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.beginPath();
      ctx.arc(px, py, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // tier tint overlay (very subtle)
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.08;
  const tint = ctx.createLinearGradient(0, 0, W, H);
  tint.addColorStop(0, hexToRgba(theme.base, 0.18));
  tint.addColorStop(1, hexToRgba(theme.dark, 0.18));
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, W, H);

  ctx.restore();
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
}

function hexToRgba(hex, a = 1) {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map(ch => ch + ch).join("") : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}

// ===== UI helpers =====
function drawLabelValue(ctx, x, y, label, value) {
  ctx.save();

  ctx.fillStyle = "rgba(255,255,255,0.76)";
  ctx.font = "700 38px system-ui, -apple-system, Segoe UI, Roboto, Arial";
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
      _logoFrame = await loadVideoFrame("assets/logo.webm", 0.0);
    }
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.drawImage(_logoFrame, x, y, w, h);
    ctx.restore();
  } catch {
    // ignore
  }
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
      setTimeout(() => { clean(); resolve(v); }, 160);
    };
  });
}

// ===== rounded rect helpers =====
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

// ===== mesh + grain =====
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

// ===== avatar draw =====
async function drawAvatarRounded(ctx, src, x, y, w, h, r) {
  ctx.save();
  roundedRectPath(ctx, x, y, w, h, r);
  ctx.clip();

  if (!src || !src.startsWith("data:")) {
    try {
      const fallback = await loadImage("assets/uploadavatar.jpg");
      ctx.filter = "blur(7px)";
      drawCover(ctx, fallback, x, y, w, h);
      ctx.filter = "none";
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(x, y, w, h);
    } catch {
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(x, y, w, h);
    }
    ctx.restore();
    return;
  }

  try {
    const img = await loadImage(src);
    ctx.filter = "none";
    drawCover(ctx, img, x, y, w, h);
  } catch {
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(x, y, w, h);
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
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// initial render
computeSummary();
