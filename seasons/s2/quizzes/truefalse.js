const MB_KEYS = {
  profile: "mb_profile",

  doneMagic: "mb2_done_truefalse",
  resMagic: "mb2_result_truefalse",
  prevMagic: "mb2_prev_truefalse",

  progMagic: "mb2_prog_truefalse",
  progMagicState: "mb2_prog_truefalse_state",

  reviewHiddenMagic: "mb_review_hidden_magicblock",
};

const QUIZ_CARD = {
  title: "How well do you know MagicBlock?",
  idPrefix: "MagicStudent",
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

function makeSerial(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
function ensureResultId(prefix, existing) {
  if (existing && typeof existing === "string" && existing.startsWith("MB-")) return existing;
  return `MB-${prefix}-${makeSerial(6)}`;
}

/* ===== Progress helpers (MagicBlock) ===== */
function saveProgressMagic(idx0, correct, answers) {
  const total = 10;
  const idx = Math.max(0, Math.min(total - 1, Number(idx0) || 0));
  const qNum = Math.max(1, Math.min(total, idx + 1));

  localStorage.setItem(MB_KEYS.progMagic, String(qNum));
  localStorage.setItem(
    MB_KEYS.progMagicState,
    JSON.stringify({
      idx,
      correct: Number.isFinite(correct) ? correct : 0,
      answers: Array.isArray(answers) ? answers : [],
    })
  );
}

function loadProgressMagic() {
  const n = Number(localStorage.getItem(MB_KEYS.progMagic) || "0");
  const state = safeJSONParse(localStorage.getItem(MB_KEYS.progMagicState), null);
  if (!Number.isFinite(n) || n <= 0) return null;

  const fallbackIdx = Math.max(0, Math.min(9, n - 1));
  const idx = Number.isFinite(state?.idx) ? state.idx : fallbackIdx;

  return {
    idx: Math.max(0, Math.min(9, idx)),
    correct: Number.isFinite(state?.correct) ? state.correct : 0,
    answers: Array.isArray(state?.answers) ? state.answers : [],
  };
}

function clearProgressMagic() {
  localStorage.removeItem(MB_KEYS.progMagic);
  localStorage.removeItem(MB_KEYS.progMagicState);
}

document.addEventListener("DOMContentLoaded", () => {
  forcePlayAll(".bg__video");
  forcePlayAll(".brand__logo");
  renderTopProfile();

  // Topbar navigation (Seasons dropdown)
  (function initSeasonMenu(){
    const menu = document.getElementById("seasonMenu");
    if (!menu) return;
    const btn = menu.querySelector("button");
    const links = menu.querySelectorAll("a");

    btn?.addEventListener("click", (e) => {
      e.preventDefault();
      menu.classList.toggle("isOpen");
    });
    links.forEach(a => a.addEventListener("click", () => menu.classList.remove("isOpen")));

    document.addEventListener("click", (e) => {
      if (!menu.contains(e.target)) menu.classList.remove("isOpen");
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") menu.classList.remove("isOpen");
    });
  })();

  const achievementsBtn = document.getElementById("achievementsBtn");
  if (achievementsBtn) achievementsBtn.addEventListener("click", () => (location.href = "../index.html#achievements"));

  const QUESTIONS = [
  { q: "Coming soon — Statement 1", a: "True", options: ["True","False"] },
  { q: "Coming soon — Statement 2", a: "True", options: ["True","False"] },
  { q: "Coming soon — Statement 3", a: "True", options: ["True","False"] },
  { q: "Coming soon — Statement 4", a: "True", options: ["True","False"] },
  { q: "Coming soon — Statement 5", a: "True", options: ["True","False"] },
  { q: "Coming soon — Statement 6", a: "True", options: ["True","False"] },
  { q: "Coming soon — Statement 7", a: "True", options: ["True","False"] },
  { q: "Coming soon — Statement 8", a: "True", options: ["True","False"] },
  { q: "Coming soon — Statement 9", a: "True", options: ["True","False"] },
  { q: "Coming soon — Statement 10", a: "True", options: ["True","False"] }
];

  const quizPanel = document.getElementById("quizPanel");
  const resultPanel = document.getElementById("resultPanel");

  const qTitle = document.getElementById("qTitle");
  const questionText = document.getElementById("questionText");
  const optionsEl = document.getElementById("options");
  const nextBtn = document.getElementById("nextBtn");

  const rName = document.getElementById("rName");
  const rTotal = document.getElementById("rTotal");
  const rCorrect = document.getElementById("rCorrect");
  const rAcc = document.getElementById("rAcc");

  const genBtn = document.getElementById("genBtn");
  const cardZone = document.getElementById("cardZone");
  const cardCanvas = document.getElementById("cardCanvas");
  const dlBtn = document.getElementById("dlBtn");

  const reviewBox = document.getElementById("reviewBox");
  const reviewList = document.getElementById("reviewList");

  const criticalOk = !!(quizPanel && qTitle && questionText && optionsEl && nextBtn && resultPanel);
  if (!criticalOk) {
    console.error("[MagicBlock Quiz] Missing critical DOM nodes. Check IDs in magicblock.html.");
    return;
  }

  let idx = 0;
  let correct = 0;
  let selectedIndex = null;
  let answers = [];

  const savedRes = safeJSONParse(localStorage.getItem(MB_KEYS.resMagic), null);
  const done = localStorage.getItem(MB_KEYS.doneMagic) === "1";

  // ===== Answer Review render =====
  function renderAnswerReviewMagic() {
    if (!reviewBox || !reviewList) return;

    if (localStorage.getItem(MB_KEYS.reviewHiddenMagic) === "1") {
      reviewBox.classList.add("isGone");
      return;
    }

    reviewList.innerHTML = "";

    QUESTIONS.forEach((q, i) => {
      const correctLabel = q.options?.[q.correctIndex] ?? "—";
      const question = q.text || "—";

      const item = document.createElement("div");
      item.className = "reviewItem";

      const qEl = document.createElement("div");
      qEl.className = "reviewQ";
      qEl.textContent = `Question ${i + 1}`;

      const right = document.createElement("div");

      const aEl = document.createElement("div");
      aEl.className = "reviewA";
      aEl.textContent = correctLabel;

      const hint = document.createElement("div");
      hint.className = "reviewHint";
      hint.textContent = question;

      right.appendChild(aEl);
      right.appendChild(hint);

      item.appendChild(qEl);
      item.appendChild(right);
      reviewList.appendChild(item);
    });

    reviewBox.classList.remove("isHidden", "isGone");
  }

  // If completed => show result
  if (done && savedRes) {
    if (!savedRes.id) {
      savedRes.id = ensureResultId(QUIZ_CARD.idPrefix, savedRes.id);
      localStorage.setItem(MB_KEYS.resMagic, JSON.stringify(savedRes));
    }
  
    clearProgressMagic();
    showResult(savedRes);
  
    // ✅ важливо: preview відновлюємо, але НЕ виходимо зі скрипта
    restoreQuizPreview(MB_KEYS.prevMagic, cardCanvas, cardZone, dlBtn, genBtn);
  
  } else {
    const prog = loadProgressMagic();
    if (prog) {
      idx = prog.idx;
      correct = prog.correct;
      answers = prog.answers;
    }
  
    saveProgressMagic(idx, correct, answers);
    renderQuestion();
  
    window.addEventListener("beforeunload", () => {
      if (localStorage.getItem(MB_KEYS.doneMagic) !== "1") {
        saveProgressMagic(idx, correct, answers);
      }
    });
  }

  window.addEventListener("beforeunload", () => {
    if (localStorage.getItem(MB_KEYS.doneMagic) !== "1") {
      saveProgressMagic(idx, correct, answers);
    }
  });

  function renderQuestion() {
    const q = QUESTIONS[idx];
    if (!q) return;

    selectedIndex = null;
    nextBtn.disabled = true;
    nextBtn.classList.remove("isShow");

    qTitle.textContent = `Question ${idx + 1} of ${QUESTIONS.length}`;
    questionText.textContent = q.text || "—";

    optionsEl.innerHTML = "";
    (q.options || ["A", "B", "C", "D"]).forEach((label, i) => {
      const btn = document.createElement("button");
      btn.className = "optionBtn";
      btn.type = "button";
      btn.textContent = `${String.fromCharCode(65 + i)}) ${label}`;
      btn.addEventListener("click", () => {
        selectedIndex = i;
        updateSelectedUI();
        nextBtn.disabled = false;
        nextBtn.classList.add("isShow");
      });
      optionsEl.appendChild(btn);
    });

    saveProgressMagic(idx, correct, answers);
  }

  function updateSelectedUI() {
    [...optionsEl.querySelectorAll(".optionBtn")].forEach((b, i) => {
      b.classList.toggle("isSelected", i === selectedIndex);
    });
  }

  nextBtn.addEventListener("click", () => {
    if (selectedIndex === null) return;

    const q = QUESTIONS[idx];
    answers[idx] = selectedIndex;
    if (selectedIndex === q.correctIndex) correct++;

    idx++;

    if (idx < QUESTIONS.length) {
      saveProgressMagic(idx, correct, answers);
      renderQuestion();
      return;
    }

    const total = QUESTIONS.length;
    const acc = Math.round((correct / total) * 100);
    const p = getProfile();

    const old = safeJSONParse(localStorage.getItem(MB_KEYS.resMagic), null);
    const id = ensureResultId(QUIZ_CARD.idPrefix, old?.id || null);

    const result = {
      total,
      correct,
      acc,
      name: p?.name || "Player",
      id,
      ts: Date.now(),
    };

    localStorage.setItem(MB_KEYS.doneMagic, "1");
    localStorage.setItem(MB_KEYS.resMagic, JSON.stringify(result));

    clearProgressMagic();
    showResult(result);
  });

  function showResult(result) {
    quizPanel.style.display = "none";
    resultPanel.style.display = "block";

    if (rName) rName.textContent = result.name || "Player";
    if (rTotal) rTotal.textContent = String(result.total);
    if (rCorrect) rCorrect.textContent = String(result.correct);
    if (rAcc) rAcc.textContent = `${result.acc}%`;

    renderAnswerReviewMagic();
  }

  genBtn?.addEventListener("click", async () => {
    // Hide review назавжди
    if (reviewBox && !reviewBox.classList.contains("isGone")) {
      reviewBox.classList.add("isHidden");
      setTimeout(() => reviewBox.classList.add("isGone"), 220);
    }
    localStorage.setItem(MB_KEYS.reviewHiddenMagic, "1");

    const p = getProfile();
    const r = safeJSONParse(localStorage.getItem(MB_KEYS.resMagic), null);
    if (!r || !cardCanvas) return;

    await drawQuizResultCard(cardCanvas, {
      title: QUIZ_CARD.title,
      name: p?.name || "Player",
      avatar: p?.avatar || "",
      correct: r.correct,
      total: r.total,
      acc: r.acc,
      idText: r.id || ensureResultId(QUIZ_CARD.idPrefix, null),
      logoSrc: "../../../assets/logo.webm",
    });

    cardZone?.classList.add("isOpen");
    if (dlBtn) dlBtn.disabled = false;

    try {
      const prev = exportPreviewDataURL(cardCanvas, 520, 0.85);
      localStorage.setItem(MB_KEYS.prevMagic, prev);
      localStorage.removeItem("mb_png_magicblock");
    } catch (e) {
      console.warn("MagicBlock preview save failed:", e);
      try { localStorage.removeItem(MB_KEYS.prevMagic); } catch {}
    }

    if (genBtn) genBtn.textContent = "Regenerate Result Card";
    cardZone?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  dlBtn?.addEventListener("click", async () => {
    if (!cardCanvas) return;

    const p = getProfile();
    const r = safeJSONParse(localStorage.getItem(MB_KEYS.resMagic), null);
    if (!r) return;

    await drawQuizResultCard(cardCanvas, {
      title: QUIZ_CARD.title,
      name: p?.name || "Player",
      avatar: p?.avatar || "",
      correct: r.correct,
      total: r.total,
      acc: r.acc,
      idText: r.id || ensureResultId(QUIZ_CARD.idPrefix, null),
      logoSrc: "../../../assets/logo.webm",
    });

    const a = document.createElement("a");
    a.download = "magicblock-knowledge-result.png";
    a.href = cardCanvas.toDataURL("image/png");
    a.click();
  });

  restoreQuizPreview(MB_KEYS.prevMagic, cardCanvas, cardZone, dlBtn, genBtn);
});

/* =========================
   PREVIEW RESTORE
========================= */
async function restoreQuizPreview(previewKey, cardCanvas, cardZone, dlBtn, genBtn) {
  const prev = localStorage.getItem(previewKey);
  if (!prev || !prev.startsWith("data:image/") || !cardCanvas) return false;

  try {
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = prev;
    });

    cardCanvas.width = img.naturalWidth || img.width;
    cardCanvas.height = img.naturalHeight || img.height;

    const ctx = cardCanvas.getContext("2d");
    ctx.clearRect(0, 0, cardCanvas.width, cardCanvas.height);
    ctx.drawImage(img, 0, 0);

    cardZone?.classList.add("isOpen");
    if (dlBtn) dlBtn.disabled = false;
    if (genBtn) genBtn.textContent = "Regenerate Result Card";
    return true;
  } catch (e) {
    console.warn("restore magicblock preview failed:", e);
    return false;
  }
}

function exportPreviewDataURL(srcCanvas, maxW = 520, quality = 0.85) {
  const w = srcCanvas.width;
  const scale = Math.min(1, maxW / w);
  const tw = Math.round(w * scale);
  const th = Math.round(srcCanvas.height * scale);

  const t = document.createElement("canvas");
  t.width = tw;
  t.height = th;

  const ctx = t.getContext("2d");
  ctx.drawImage(srcCanvas, 0, 0, tw, th);

  return t.toDataURL("image/jpeg", quality);
}

/* =========================
   CANVAS DRAW (MagicBlock)
========================= */
async function drawQuizResultCard(canvas, d) {
  const ctx = canvas.getContext("2d");

  canvas.width = 1600;
  canvas.height = 900;

  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const card = { x: 0, y: 0, w: W, h: H, r: 96 };
  drawRoundedRect(ctx, card.x, card.y, card.w, card.h, card.r);
  ctx.fillStyle = "#BFC0C2";
  ctx.fill();

  const vg = ctx.createRadialGradient(W * 0.52, H * 0.38, 140, W * 0.52, H * 0.38, W * 0.95);
  vg.addColorStop(0, "rgba(255,255,255,.22)");
  vg.addColorStop(1, "rgba(0,0,0,.12)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  addNoise(ctx, 0, 0, W, H, 0.055);

  const padX = 130;
  const padTop = 120;

  const logoBox = { x: padX, y: padTop - 55, w: 380, h: 120 };
  const logoBitmap = await loadWebmFrameAsBitmap(d.logoSrc || "../../../assets/logo.webm", 0.05);
  if (logoBitmap) drawContainBitmap(ctx, logoBitmap, logoBox.x, logoBox.y, logoBox.w, logoBox.h);

  const title = d.title || QUIZ_CARD.title;
  const titleLeft = logoBox.x + logoBox.w + 70;
  const titleRight = W - padX;
  const titleMaxW = Math.max(260, titleRight - titleLeft);

  const titleY = padTop + 10;
  ctx.fillStyle = "rgba(255,255,255,.92)";
  ctx.font = fitText(ctx, title, 76, 52, titleMaxW, "950");
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(title, titleLeft, titleY);

  const avatarBox = { x: padX + 10, y: 240, w: 260, h: 260, r: 80 };
  await drawAvatarRounded(ctx, d.avatar, avatarBox.x, avatarBox.y, avatarBox.w, avatarBox.h, avatarBox.r);

  ctx.save();
  drawRoundedRect(ctx, avatarBox.x, avatarBox.y, avatarBox.w, avatarBox.h, avatarBox.r);
  ctx.strokeStyle = "rgba(255,255,255,.18)";
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.restore();

  const leftColX = avatarBox.x + avatarBox.w + 120;
  const rightX = W - padX;

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = "rgba(255,255,255,.72)";
  ctx.font = "800 26px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText("Your Name:", leftColX, avatarBox.y + 80);

  ctx.fillStyle = "rgba(255,255,255,.92)";
  ctx.font = "950 64px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(d.name || "Player", leftColX, avatarBox.y + 150);

  ctx.strokeStyle = "rgba(255,255,255,.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(leftColX, avatarBox.y + 185);
  ctx.lineTo(rightX, avatarBox.y + 185);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,.72)";
  ctx.font = "800 26px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText("Score", leftColX, avatarBox.y + 275);

  ctx.fillStyle = "rgba(255,255,255,.92)";
  ctx.font = "980 80px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(`${d.correct} / ${d.total}`, leftColX, avatarBox.y + 360);

  const idLabelY = 665;
  ctx.fillStyle = "rgba(255,255,255,.70)";
  ctx.font = "800 22px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText("ID Name:", leftColX, idLabelY);

  const pillX = leftColX;
  const pillY = 685;
  const pillW = Math.min(940, rightX - pillX);
  const pillH = 74;

  ctx.fillStyle = "rgba(0,0,0,.28)";
  drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 36);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,.92)";
  ctx.font = "900 30px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.textBaseline = "middle";
  ctx.fillText(d.idText || "MB-MagicStudent-XXXXX", pillX + 30, pillY + pillH / 2);

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(0,0,0,.34)";
  ctx.font = "900 24px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(`Accuracy: ${d.acc}%`, avatarBox.x, H - 56);
}

/* =========================
   CANVAS HELPERS
========================= */
function drawRoundedRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function fitText(ctx, text, maxPx, minPx, maxW, weight = "900") {
  for (let px = maxPx; px >= minPx; px--) {
    const f = `${weight} ${px}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
    ctx.font = f;
    if (ctx.measureText(text).width <= maxW) return f;
  }
  return `${weight} ${minPx}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
}

async function drawAvatarRounded(ctx, dataUrl, x, y, w, h, r) {
  ctx.save();
  drawRoundedRect(ctx, x, y, w, h, r);
  ctx.clip();

  ctx.fillStyle = "rgba(255,255,255,.18)";
  ctx.fillRect(x, y, w, h);

  if (dataUrl && dataUrl.startsWith("data:")) {
    const img = await loadImage(dataUrl);
    drawCoverImage(ctx, img, x, y, w, h);
  }
  ctx.restore();
}

function drawCoverImage(ctx, img, x, y, w, h) {
  const sw = img.naturalWidth || img.width;
  const sh = img.naturalHeight || img.height;
  if (!sw || !sh) return;

  const s = Math.max(w / sw, h / sh);
  const dw = sw * s;
  const dh = sh * s;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function drawContainBitmap(ctx, bmp, x, y, w, h) {
  const sw = bmp.width, sh = bmp.height;
  if (!sw || !sh) return;

  const s = Math.min(w / sw, h / sh);
  const dw = sw * s;
  const dh = sh * s;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.drawImage(bmp, dx, dy, dw, dh);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadWebmFrameAsBitmap(src, t = 0.05) {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.crossOrigin = "anonymous";
    v.preload = "auto";
    v.src = src;

    const cleanup = () => {
      try { v.pause(); } catch {}
      v.src = "";
    };

    v.addEventListener("error", () => { cleanup(); resolve(null); }, { once: true });

    v.addEventListener("loadedmetadata", async () => {
      try {
        const tt = Math.min(Math.max(t, 0), Math.max(0.01, (v.duration || 1) - 0.01));
        v.currentTime = tt;

        v.addEventListener("seeked", async () => {
          try {
            const vw = v.videoWidth, vh = v.videoHeight;
            if (!vw || !vh) { cleanup(); resolve(null); return; }

            const c = document.createElement("canvas");
            c.width = vw; c.height = vh;
            c.getContext("2d").drawImage(v, 0, 0, vw, vh);

            const bmp = await createImageBitmap(c);
            cleanup();
            resolve(bmp);
          } catch {
            cleanup();
            resolve(null);
          }
        }, { once: true });
      } catch {
        cleanup();
        resolve(null);
      }
    }, { once: true });
  });
}

function addNoise(ctx, x, y, w, h, alpha = 0.06) {
  const img = ctx.getImageData(x, y, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() * 255) | 0;
    d[i] = d[i] + (n - 128) * alpha;
    d[i + 1] = d[i + 1] + (n - 128) * alpha;
    d[i + 2] = d[i + 2] + (n - 128) * alpha;
  }
  ctx.putImageData(img, x, y);
}

/* =========================
   TOP PROFILE PILL
========================= */
function renderTopProfile() {
  const pill = document.getElementById("profilePill");
  if (!pill) return;

  const img = pill.querySelector("img");
  const nameEl = pill.querySelector("[data-profile-name]");
  const hintEl = pill.querySelector("[data-profile-hint]");

  const p = safeJSONParse(localStorage.getItem(MB_KEYS.profile), null);
  if (!p) {
    if (img) img.src = "";
    if (nameEl) nameEl.textContent = "No profile";
    if (hintEl) hintEl.textContent = "Go Home";
    pill.addEventListener("click", () => location.href = "../index.html");
    return;
  }

  if (img) img.src = p.avatar || "";
  if (nameEl) nameEl.textContent = p.name || "Player";
  if (hintEl) hintEl.textContent = "Edit on Home";
  pill.addEventListener("click", () => location.href = "../index.html");
}
