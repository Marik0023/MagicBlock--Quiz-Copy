const CHAMP_DESIGN_VERSION = "s2_card_v3"; // <- bump коли міняєш дизайн

const MB_KEYS = {
  profile: "mb_profile", // shared
  avatar: "mb_avatar", // shared

  // done flags (Season 2)
  doneMovieFrame: "mb_s2_done_movieframe",
  doneMovieEmoji: "mb_s2_done_movieemoji",
  doneSong: "mb_s2_done_song",
  doneSilhouette: "mb_s2_done_silhouette",
  doneTrueFalse: "mb_s2_done_truefalse",
  doneMagicBlock: "mb_s2_done_magicblock",

  // result blobs (Season 2)
  resMovieFrame: "mb_s2_result_movieframe",
  resMovieEmoji: "mb_s2_result_movieemoji",
  resSong: "mb_s2_result_song",
  resSilhouette: "mb_s2_result_silhouette",
  resTrueFalse: "mb_s2_result_truefalse",
  resMagicBlock: "mb_s2_result_magicblock",

  // champion storage (Season 2)
  champPng: "mb_s2_champ_png",
  champId: "mb_s2_champ_id",
  champReady: "mb_s2_champ_ready",
  champDesignVer: "mb_s2_champ_design_ver", // ✅ single source of truth
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
  const seasonMenu = document.getElementById("seasonMenu");
  if (seasonMenu) {
    const btn = seasonMenu.querySelector("button");
    btn?.addEventListener("click", (e) => {
      e.preventDefault();
      seasonMenu.classList.toggle("isOpen");
    });
    seasonMenu.querySelectorAll("a").forEach(a =>
      a.addEventListener("click", () => seasonMenu.classList.remove("isOpen"))
    );
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
  if (correct >= 51) return "gold";
  if (correct >= 31) return "silver";
  return "bronze";
}

const TIER_THEME = {
  gold:   { label: "GOLD",   base: "#F3C456", dark: "#8B5A12", bg1:"#1f160d", bg2:"#3a2814", glow:"rgba(255,196,86,.35)", line:"rgba(255,220,150,.70)", text:"#FFEAB2" },
  silver: { label: "SILVER", base: "#DDE3EE", dark: "#6C7483", bg1:"#13171d", bg2:"#28303a", glow:"rgba(186,212,255,.28)", line:"rgba(225,236,255,.62)", text:"#F4F8FF" },
  bronze: { label: "BRONZE", base: "#D9864D", dark: "#6D3418", bg1:"#1b120d", bg2:"#382015", glow:"rgba(255,148,92,.26)", line:"rgba(255,176,126,.58)", text:"#FFE0CC" },
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

  const id = `MB-S2-CHAMP-${randomIdPart(6)}`;
  try { localStorage.setItem(MB_KEYS.champId, id); } catch {}
  return id;
}

function computeSummary() {
  const p = getProfile();
  if (sumName) sumName.textContent = p?.name || "Player";

  const doneFlags = [
    isDone(MB_KEYS.doneMovieFrame),
    isDone(MB_KEYS.doneMovieEmoji),
    isDone(MB_KEYS.doneSong),
    isDone(MB_KEYS.doneSilhouette),
    isDone(MB_KEYS.doneTrueFalse),
    isDone(MB_KEYS.doneMagicBlock),
  ];
  const doneCount = doneFlags.filter(Boolean).length;
  if (sumDone) sumDone.textContent = `${doneCount} / 6`;

  const r1 = loadResult(MB_KEYS.resMovieFrame);
  const r2 = loadResult(MB_KEYS.resMovieEmoji);
  const r3 = loadResult(MB_KEYS.resSong);
  const r4 = loadResult(MB_KEYS.resSilhouette);
  const r5 = loadResult(MB_KEYS.resTrueFalse);
  const r6 = loadResult(MB_KEYS.resMagicBlock);

  const results = [r1, r2, r3, r4, r5, r6].filter(Boolean);
  const total = results.reduce((a, r) => a + (r.total || 0), 0);
  const correct = results.reduce((a, r) => a + (r.correct || 0), 0);
  const acc = total ? Math.round((correct / total) * 100) : 0;

  if (sumTotal) sumTotal.textContent = String(total);
  if (sumCorrect) sumCorrect.textContent = String(correct);
  if (sumAcc) sumAcc.textContent = `${acc}%`;

  const unlocked = doneCount === 6 && results.length === 6 && !!p;
  const tier = getTierByCorrect(correct);
  const champId = getOrCreateChampionId();

  return { unlocked, total, correct, acc, profile: p, tier, champId };
}

/* =========================
   ✅ AUTO INVALIDATE OLD CACHE
========================= */
function invalidateOldChampionIfDesignChanged() {
  try {
    const cur = localStorage.getItem(MB_KEYS.champDesignVer);
    if (cur !== CHAMP_DESIGN_VERSION) {
      localStorage.setItem(MB_KEYS.champDesignVer, CHAMP_DESIGN_VERSION);
      localStorage.removeItem(MB_KEYS.champPng);
      localStorage.removeItem(MB_KEYS.champReady);
    }
  } catch {}
}

/* =========================
   ✅ RESTORE PREVIEW (NO UPSCALE)
========================= */
async function restoreChampionIfExists() {
  // ✅ якщо дизайн версія інша — не підтягуємо старий preview
  const ver = localStorage.getItem(MB_KEYS.champDesignVer);
  if (ver !== CHAMP_DESIGN_VERSION) {
    try { localStorage.removeItem(MB_KEYS.champPng); } catch {}
    return false;
  }

  const prev = localStorage.getItem(MB_KEYS.champPng);
  if (!prev || !prev.startsWith("data:image/") || !cardCanvas) return false;

  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = prev;
    });

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
    if (preview && preview.startsWith("data:image/")) {
      localStorage.setItem(MB_KEYS.champPng, preview);
      localStorage.setItem(MB_KEYS.champReady, "1");
      localStorage.setItem(MB_KEYS.champDesignVer, CHAMP_DESIGN_VERSION);
    }
  } catch (e) {
    console.warn("preview save failed:", e);
    try { localStorage.removeItem(MB_KEYS.champPng); } catch {}
    console.warn("Storage quota hit while saving preview. Skipping local preview persistence.");
  }
}

/* =========================
   🎉 CONFETTI (after Generate)
========================= */
function launchConfetti(durationMs = 1600) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100vw",
    height: "100vh",
    pointerEvents: "none",
    zIndex: "9999",
  });
  document.body.appendChild(canvas);

  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const resize = () => {
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
  };
  resize();
  window.addEventListener("resize", resize);

  const rand = (a, b) => a + Math.random() * (b - a);
  const colors = ["#ffffff", "#ffd54a", "#bdbdbd", "#9b561e", "#6e3610"];
  const pieces = Array.from({ length: 180 }, () => ({
    x: rand(0, canvas.width),
    y: rand(-canvas.height * 0.2, canvas.height * 0.2),
    vx: rand(-2.2, 2.2) * dpr,
    vy: rand(2.0, 6.0) * dpr,
    g: rand(0.08, 0.16) * dpr,
    w: rand(6, 12) * dpr,
    h: rand(3, 8) * dpr,
    rot: rand(0, Math.PI * 2),
    vr: rand(-0.18, 0.18),
    c: colors[(Math.random() * colors.length) | 0],
    life: rand(0.75, 1.0),
  }));

  const t0 = performance.now();
  function tick(t) {
    const p = (t - t0) / durationMs;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    pieces.forEach(o => {
      o.vy += o.g;
      o.x += o.vx;
      o.y += o.vy;
      o.rot += o.vr;

      const fade = Math.max(0, 1 - p / o.life);
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(o.x, o.y);
      ctx.rotate(o.rot);
      ctx.fillStyle = o.c;
      ctx.fillRect(-o.w / 2, -o.h / 2, o.w, o.h);
      ctx.restore();
    });

    if (p < 1) requestAnimationFrame(tick);
    else {
      window.removeEventListener("resize", resize);
      canvas.remove();
    }
  }
  requestAnimationFrame(tick);
}

// ===== Actions =====
genBtn?.addEventListener("click", async () => {
  const s = computeSummary();
  if (!s.unlocked) return;

  await drawChampionCard(s);

  cardZone?.classList.add("isOpen");
  cardZone?.scrollIntoView({ behavior: "smooth", block: "start" });

  launchConfetti(1700);

  if (dlBtn) dlBtn.disabled = false;

  saveChampionPreview();

  try {
    const uploadDataUrl = exportPreviewPNG(cardCanvas, 1400);
    if (window.MBQ_LEADERBOARD?.syncFromLocal) {
      await window.MBQ_LEADERBOARD.syncFromLocal("s2", uploadDataUrl);
    }
  } catch (e) {
    console.warn("Leaderboard sync failed (S2):", e);
  }

  if (genBtn) genBtn.textContent = "Regenerate Champion Card";
});

dlBtn?.addEventListener("click", async () => {
  if (!cardCanvas) return;

  const s = computeSummary();
  if (!s.unlocked) return;

  await drawChampionCard(s);

  const a = document.createElement("a");
  a.download = "magicblock-champion-card-s2.png";
  a.href = cardCanvas.toDataURL("image/png");
  a.click();
});

// ===== Canvas assets cache =====
let _noisePattern = null;
let _logoFrame = null;
let _wmLogo = null;

// ===== DRAW =====
async function drawChampionCard(summary) {
  if (!cardCanvas) return;

  const W = 1400;
  const H = 800;
  if (cardCanvas.width !== W) cardCanvas.width = W;
  if (cardCanvas.height !== H) cardCanvas.height = H;

  const ctx = cardCanvas.getContext("2d");
  ctx.clearRect(0, 0, W, H);

  const theme = TIER_THEME[summary.tier] || TIER_THEME.bronze;
  const pad = 58;

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, theme.bg1 || "#18130f");
  bg.addColorStop(0.55, theme.bg2 || "#2a2018");
  bg.addColorStop(1, "#0e0f12");
  ctx.fillStyle = bg;
  roundRect(ctx, 0, 0, W, H, 80, true, false);

  const rg1 = ctx.createRadialGradient(W*0.20, H*0.16, 20, W*0.20, H*0.16, W*0.58);
  rg1.addColorStop(0, theme.glow || "rgba(255,200,120,.28)");
  rg1.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rg1; roundRect(ctx,0,0,W,H,80,true,false);

  const rg2 = ctx.createRadialGradient(W*0.86, H*0.78, 20, W*0.86, H*0.78, W*0.40);
  rg2.addColorStop(0, (theme.glow||"rgba(255,200,120,.28)").replace(/\.\d+\)/, '.20)'));
  rg2.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rg2; roundRect(ctx,0,0,W,H,80,true,false);

  ctx.save();
  roundedRectPath(ctx, 0, 0, W, H, 80); ctx.clip();
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = theme.line || "rgba(255,255,255,.45)";
  ctx.lineWidth = 1;
  const r = 16;
  const hw = Math.sqrt(3) * r;
  const hh = 2 * r;
  const vstep = hh * 0.75;
  for (let row = -2, y = 40; y < H + 30; row++, y += vstep) {
    const offset = (row % 2 ? hw / 2 : 0);
    for (let x = -40 + offset; x < W + 40; x += hw) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 3 * i + Math.PI / 6;
        const px = x + r * Math.cos(a);
        const py = y + r * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.restore();

  ctx.save();
  roundedRectPath(ctx, 0, 0, W, H, 80); ctx.clip();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 70; i++) {
    const x = 40 + ((i * 97) % (W - 80));
    const y = 40 + ((i * 131) % (H - 80));
    const size = (i % 3) + 1;
    ctx.globalAlpha = i % 5 === 0 ? 0.45 : 0.18;
    ctx.fillStyle = theme.line || "rgba(255,255,255,.5)";
    ctx.fillRect(x, y, size, size);
  }
  ctx.restore();
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;

  const edge = ctx.createLinearGradient(0, 0, W, H);
  edge.addColorStop(0, theme.base);
  edge.addColorStop(0.5, "#fff2bf");
  edge.addColorStop(1, theme.base);

  ctx.save();
  ctx.lineWidth = 9;
  ctx.strokeStyle = edge;
  ctx.shadowColor = theme.glow || "rgba(255,200,120,.25)";
  ctx.shadowBlur = 16;
  roundRect(ctx, 10, 10, W - 20, H - 20, 72, false, true);
  ctx.restore();

  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  roundRect(ctx, 18, 18, W - 36, H - 36, 66, false, true);
  ctx.strokeStyle = theme.line || "rgba(255,255,255,.32)";
  ctx.globalAlpha = 0.75;
  roundRect(ctx, 22, 22, W - 44, H - 44, 64, false, true);
  ctx.globalAlpha = 1;

  await drawWatermark(ctx, W, H);
  await drawLogo(ctx, pad, 26, 300, 110, 0.98);

  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = theme.text || "rgba(255,255,255,.95)";
  ctx.font = "900 60px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  applyTextShadow(ctx, 0.28, 10, 0, 2);
  ctx.fillText("Champion Card", W / 2, 78);
  clearTextShadow(ctx);
  drawSeasonBadgePremium(ctx, W / 2, 104, "SEASON 2", theme);
  ctx.restore();

  drawStatusPillPremium(ctx, W - pad - 190, 28, 190, 66, theme.label, theme);

  const ax = 56, ay = 170, as = 360, ar = 66;
  const ring = ctx.createLinearGradient(ax, ay, ax + as, ay + as);
  ring.addColorStop(0, theme.base);
  ring.addColorStop(0.45, "#fff0be");
  ring.addColorStop(1, theme.dark);

  ctx.save();
  ctx.lineWidth = 8;
  ctx.strokeStyle = ring;
  ctx.shadowColor = theme.glow || "rgba(255,200,120,.25)";
  ctx.shadowBlur = 14;
  roundRect(ctx, ax, ay, as, as, ar, false, true);
  ctx.restore();

  ctx.fillStyle = "rgba(255,255,255,.04)";
  roundRect(ctx, ax + 8, ay + 8, as - 16, as - 16, ar - 10, true, false);
  ctx.strokeStyle = "rgba(255,255,255,.15)";
  ctx.lineWidth = 2;
  roundRect(ctx, ax + 8, ay + 8, as - 16, as - 16, ar - 10, false, true);

  await drawAvatarRounded(ctx, summary.profile?.avatar || "", ax + 14, ay + 14, as - 28, as - 28, ar - 16);

  const tx = 500;
  const maxRight = W - 90;
  const name = (summary.profile?.name || "Player").trim() || "Player";
  const scoreText = `${summary.correct} / ${summary.total}`;

  ctx.fillStyle = "rgba(255,245,220,.92)";
  ctx.font = "800 34px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.textAlign = "left";
  ctx.fillText("Your Name", tx, 285);

  fitFillLeft(ctx, name, tx, 360, maxRight - tx, 78, 42, 950, theme.text || "#fff");

  ctx.strokeStyle = "rgba(255,255,255,.18)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(tx, 405); ctx.lineTo(maxRight, 405); ctx.stroke();

  ctx.fillStyle = "rgba(255,245,220,.92)";
  ctx.font = "800 34px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText("Total Score", tx, 470);

  fitFillLeft(ctx, scoreText, tx, 548, 360, 86, 46, 950, theme.text || "#fff", true, theme.glow);

  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = theme.line || "rgba(255,255,255,.4)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(48, 620); ctx.lineTo(W - 48, 620); ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.fillStyle = "rgba(255,230,180,.90)";
  ctx.font = "800 30px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(`Accuracy: ${summary.acc}%`, 78, 705);

  drawStatusPillPremium(ctx, 400, 653, 560, 70, `ID: ${summary.champId}`, theme, 24);
}

function fitFillLeft(ctx, text, x, y, maxW, startSize, minSize, weight, color, glow = false, glowColor = "rgba(255,255,255,.2)") {
  let size = startSize;
  while (size >= minSize) {
    ctx.font = `${weight} ${size}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
    if (ctx.measureText(text).width <= maxW) break;
    size -= 2;
  }
  ctx.fillStyle = color;
  if (glow) { ctx.shadowColor = glowColor; ctx.shadowBlur = 10; }
  ctx.fillText(text, x, y);
  if (glow) clearTextShadow(ctx);
}

function drawSeasonBadgePremium(ctx, centerX, y, label, theme) {
  ctx.save();
  ctx.font = "900 22px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  const w = Math.ceil(ctx.measureText(label).width + 74);
  const h = 52;
  const x = Math.round(centerX - w / 2);
  ctx.fillStyle = "rgba(255,255,255,.05)";
  ctx.strokeStyle = "rgba(255,255,255,.16)";
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 20, true, true);
  ctx.fillStyle = theme.text || "rgba(255,255,255,.95)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = theme.line || "rgba(255,255,255,.35)";
  ctx.globalAlpha = 0.65;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x - 56, y + h/2); ctx.lineTo(x - 12, y + h/2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + w + 12, y + h/2); ctx.lineTo(x + w + 56, y + h/2); ctx.stroke();
  ctx.restore();
}

function drawStatusPillPremium(ctx, x, y, w, h, label, theme, fontSize) {
  ctx.save();
  const fillG = ctx.createLinearGradient(x, y, x, y + h);
  fillG.addColorStop(0, "rgba(255,255,255,.09)");
  fillG.addColorStop(1, "rgba(0,0,0,.20)");
  ctx.fillStyle = fillG;
  ctx.strokeStyle = theme.line || "rgba(255,255,255,.3)";
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, Math.min(26, h/2), true, true);

  ctx.fillStyle = theme.text || "rgba(255,255,255,.95)";
  ctx.font = `900 ${fontSize || 30}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  applyTextShadow(ctx, 0.18, 6, 0, 1);
  ctx.fillText(label, x + w/2, y + h/2 + 1);
  clearTextShadow(ctx);
  ctx.restore();
}

// ✅ season badge (small pill under title)
function drawSeasonBadge(ctx, centerX, y, label) {
  const padX = 40;
  const h = 56;
  ctx.save();

  ctx.font = "900 22px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  const w = Math.ceil(ctx.measureText(label).width + padX * 2);
  const x = Math.round(centerX - w / 2);

  ctx.fillStyle = "rgba(0,0,0,0.24)";
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 20, true, true);

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  applyTextShadow(ctx, 0.22, 8, 0, 2);
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  clearTextShadow(ctx);

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

// ===== Logo drawing (top-left animated logo frame) =====
async function drawLogo(ctx, x, y, w, h, opacity = 0.95) {
  try {
    if (!_logoFrame) _logoFrame = await loadVideoFrame("../../assets/logo.webm", 0.0);
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

/* =========================
   ✅ WATERMARK (single)
========================= */
async function getWatermarkLogo() {
  if (_wmLogo) return _wmLogo;

  const candidates = [
    "../../assets/brand/MagicBlock-Logomark-White.png",
    "../assets/brand/MagicBlock-Logomark-White.png",
    "./assets/brand/MagicBlock-Logomark-White.png",
    "/assets/brand/MagicBlock-Logomark-White.png",
  ];

  for (const src of candidates) {
    try {
      const img = await loadImage(src);
      _wmLogo = img;
      return _wmLogo;
    } catch {}
  }
  return null;
}

async function drawWatermark(ctx, W, H) {
  const img = await getWatermarkLogo();
  if (!img) return;

  ctx.save();
  roundedRectPath(ctx, 0, 0, W, H, 80);
  ctx.clip();

  ctx.globalAlpha = 0.12;
  ctx.globalCompositeOperation = "screen";

  const boxW = W * 0.44;
  const boxH = H * 0.78;
  const boxX = W * 0.56;
  const boxY = H * 0.12;

  drawContain(ctx, img, boxX, boxY, boxW, boxH);

  ctx.restore();
  ctx.globalCompositeOperation = "source-over";
}

function drawContain(ctx, img, x, y, w, h) {
  const iw = img.width;
  const ih = img.height;
  const ir = iw / ih;
  const rr = w / h;

  let dw, dh, dx, dy;
  if (ir > rr) {
    dw = w; dh = w / ir; dx = x; dy = y + (h - dh) / 2;
  } else {
    dh = h; dw = h * ir; dx = x + (w - dw) / 2; dy = y;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
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

  if (!src) src = "";

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
    if (typeof src === "string" && src && !src.startsWith("data:")) img.crossOrigin = "anonymous";
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
  invalidateOldChampionIfDesignChanged();

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
