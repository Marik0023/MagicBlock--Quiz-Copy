// champion.js (UPDATED - landscape card only + top-right logo)

const MB_KEYS = {
  profile: "mb_profile",
  doneSong: "mb_done_song",
  doneMovie: "mb_done_movie",
  doneMagic: "mb_done_magicblock",
  resSong: "mb_result_song",
  resMovie: "mb_result_movie",
  resMagic: "mb_result_magicblock",
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

function getTierByCorrect(correct) {
  if (correct >= 25) return "gold";
  if (correct >= 15) return "silver";
  return "bronze";
}

const TIER_THEME = {
  gold:   { label: "Gold",   base: "#d2a24d", dark: "#b37f2f" },
  silver: { label: "Silver", base: "#bdbdbd", dark: "#9a9a9a" },
  bronze: { label: "Bronze", base: "#9b561e", dark: "#7a3f13" },
};

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
  return { unlocked, total, correct, acc, profile: p, tier };
}

genBtn?.addEventListener("click", async () => {
  const s = computeSummary();
  if (!s.unlocked) return;

  await drawChampionCard(s);

  cardZone?.classList.add("isOpen");
  cardZone?.scrollIntoView({ behavior: "smooth", block: "start" });
});

dlBtn?.addEventListener("click", () => {
  if (!cardCanvas) return;
  const a = document.createElement("a");
  a.download = "magicblock-champion-card.png";
  a.href = cardCanvas.toDataURL("image/png");
  a.click();
});

// ====== Canvas assets cache ======
let _noisePattern = null;
let _logoFrame = null;

// ====== DRAW (LANDSCAPE ONLY) ======
async function drawChampionCard(summary) {
  if (!cardCanvas) return;

  // landscape size => canvas = card (ніякого заднього фону)
  const W = 1400;
  const H = 800;

  if (cardCanvas.width !== W) cardCanvas.width = W;
  if (cardCanvas.height !== H) cardCanvas.height = H;

  const ctx = cardCanvas.getContext("2d");
  ctx.clearRect(0, 0, W, H);

  const theme = TIER_THEME[summary.tier] || TIER_THEME.bronze;

  // --- card background (tier gradient) ---
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, theme.base);
  g.addColorStop(1, theme.dark);
  ctx.fillStyle = g;
  roundRect(ctx, 0, 0, W, H, 80, true, false);

  // soft highlight
  const hi = ctx.createRadialGradient(W * 0.48, H * 0.35, 120, W * 0.55, H * 0.55, H * 0.95);
  hi.addColorStop(0, "rgba(255,255,255,0.18)");
  hi.addColorStop(1, "rgba(0,0,0,0.10)");
  ctx.fillStyle = hi;
  roundRect(ctx, 0, 0, W, H, 80, true, false);

  // mesh waves on card
  ctx.save();
  roundedRectPath(ctx, 0, 0, W, H, 80);
  ctx.clip();
  drawMesh(ctx, W, H, 0.16);
  ctx.restore();

  // grain
  ensureNoisePattern(ctx);
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = _noisePattern;
  roundRect(ctx, 0, 0, W, H, 80, true, false);
  ctx.restore();

  // border
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  roundRect(ctx, 0, 0, W, H, 80, false, true);

  // ---- top row ----
  const pad = 70;

  // left brand
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "900 46px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("MagicBlock", pad, pad + 10);

  drawPill(ctx, pad + 310, pad - 26, 120, 48, "Quiz");

  // center title
  ctx.font = "700 54px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.textAlign = "center";
  ctx.fillText("Champion Card", W / 2, pad + 10);
  ctx.textAlign = "left";

  // top-right logo (assets/logo.webm first frame)
  await drawTopRightLogo(ctx, W - pad, pad - 15);

  // ---- avatar block (left) ----
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
  await drawAvatarRounded(
    ctx,
    avatarSrc,
    ax + 12,
    ay + 12,
    as - 24,
    as - 24,
    ar - 14
  );

  // ---- text block (right) ----
  const tx = 520;
  let ty = 245;

  const name = (summary.profile?.name || "Player").trim();
  const scoreText = `${summary.correct} / ${summary.total}`;
  const tierLabel = theme.label;

  drawLabelValue(ctx, tx, ty, "Your Name:", name);
  ty += 190;
  drawLabelValue(ctx, tx, ty, "Total Score", scoreText);
  ty += 190;

  // Card status line
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "600 42px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText("Card status:", tx, ty);

  ctx.fillStyle = "rgba(255,255,255,0.96)";
  ctx.font = "950 58px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(tierLabel, tx + 280, ty);

  // Accuracy small
  ctx.fillStyle = "rgba(0,0,0,0.40)";
  ctx.font = "800 30px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(`Accuracy: ${summary.acc}%`, pad, H - 60);
}

function drawLabelValue(ctx, x, y, label, value) {
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.font = "600 42px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(label, x, y);

  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "950 66px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(value, x, y + 84);
}

// ===== Logo drawing (top-right) =====
async function drawTopRightLogo(ctx, rightX, topY) {
  // logo size
  const targetW = 160;
  const targetH = 80;

  try {
    if (!_logoFrame) {
      _logoFrame = await loadVideoFrame("assets/logo.webm", 0.0);
    }
    // draw aligned to top-right
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.drawImage(_logoFrame, rightX - targetW, topY, targetW, targetH);
    ctx.restore();
  } catch {
    // fallback: small MB text
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "900 34px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.textAlign = "right";
    ctx.fillText("MB", rightX, topY + 40);
    ctx.textAlign = "left";
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
      // seek to time (usually 0 is enough)
      try { v.currentTime = time; } catch {}
      v.onseeked = () => { clean(); resolve(v); };
      // if seeked doesn't fire (some browsers at 0), resolve soon
      setTimeout(() => { clean(); resolve(v); }, 150);
    };
  });
}

// ===== Drawing helpers =====
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

function drawPill(ctx, x, y, w, h, text) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 999, true, true);

  ctx.fillStyle = "rgba(0,0,0,0.70)";
  ctx.font = "900 28px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + w / 2, y + h / 2 + 1);
  ctx.restore();
}

function drawMesh(ctx, W, H, alpha = 0.12) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 1;

  // horizontal
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

  // vertical lighter
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

  if (!src || !src.startsWith("data:")) {
    // fallback blurred placeholder (assets/uploadavatar.jpg)
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
