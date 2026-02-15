const MB_KEYS = {
  profile: "mb_profile",
  // Season 2 keys (must match seasons/s2/app.js)
  doneMovie: "mb_s2_done_silhouette",
  resMovie: "mb_s2_result_silhouette",
  prevMovie: "mb_s2_prev_silhouette",

  progMovie: "mb_s2_prog_silhouette",            // number (1..10)
  progMovieState: "mb_s2_prog_silhouette_state", // JSON { idx, correct, answers }

  // ✅ Answer Review: hide forever after Generate
  reviewHiddenMovie: "mb_s2_review_hidden_silhouette",
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

/* ===== Progress helpers (Movie) ===== */
function saveProgressMovie(idx0, correct, answers) {
  const idx = Math.max(0, Math.min(9, Number(idx0) || 0));
  const qNum = Math.max(1, Math.min(10, idx + 1));

  localStorage.setItem(MB_KEYS.progMovie, String(qNum));
  localStorage.setItem(
    MB_KEYS.progMovieState,
    JSON.stringify({
      idx,
      correct: Number.isFinite(correct) ? correct : 0,
      answers: Array.isArray(answers) ? answers : [],
    })
  );
}
function loadProgressMovie() {
  const n = Number(localStorage.getItem(MB_KEYS.progMovie) || "0");
  const state = safeJSONParse(localStorage.getItem(MB_KEYS.progMovieState), null);
  if (!Number.isFinite(n) || n <= 0) return null;

  const fallbackIdx = Math.max(0, Math.min(9, n - 1));
  const idx = Number.isFinite(state?.idx) ? state.idx : fallbackIdx;

  return {
    idx: Math.max(0, Math.min(9, idx)),
    correct: Number.isFinite(state?.correct) ? state.correct : 0,
    answers: Array.isArray(state?.answers) ? state.answers : [],
  };
}
function clearProgressMovie() {
  localStorage.removeItem(MB_KEYS.progMovie);
  localStorage.removeItem(MB_KEYS.progMovieState);
}

/* ===== ID ===== */
function buildId(prefix) {
  const serial = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `MB-${prefix}-${serial}`;
}

/* ===== Top profile ===== */
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

document.addEventListener("DOMContentLoaded", () => {
  forcePlayAll(".bg__video");
  forcePlayAll(".brand__logo");
  renderTopProfile();

  // Topbar: Seasons dropdown (hover + tap)
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
    { frame: "../../../assets/movies/1.mp4",  options: ["The Social Network", "Steve Jobs", "The Imitation Game", "Moneyball"], correctIndex: 0 },
    { frame: "../../../assets/movies/2.mp4",  options: ["The Internship", "We’re the Millers", "Grown Ups", "Daddy’s Home"], correctIndex: 2 },
    { frame: "../../../assets/movies/3.mp4",  options: ["The Lord of the Rings", "Harry Potter", "Percy Jackson & the Olympians", "The Chronicles of Narnia"], correctIndex: 1 },
    { frame: "../../../assets/movies/4.mp4",  options: ["The Gentlemen", "Layer Cake", "RocknRolla", "Snatch"], correctIndex: 0 },
    { frame: "../../../assets/movies/5.mp4",  options: ["Wednesday", "The Umbrella Academy", "Riverdale", "Chilling Adventures of Sabrina"], correctIndex: 0 },
    { frame: "../../../assets/movies/6.mp4",  options: ["Gravity", "Interstellar", "The Martian", "Arrival"], correctIndex: 1 },
    { frame: "../../../assets/movies/7.mp4",  options: ["The OA", "The X-Files", "Dark", "Stranger Things"], correctIndex: 3 },
    { frame: "../../../assets/movies/8.mp4",  options: ["Need for Speed", "Baby Driver", "Gone in 60 Seconds", "The Fast and the Furious"], correctIndex: 3 },
    { frame: "../../../assets/movies/9.mp4",  options: ["The Hangover", "Superbad", "21 Jump Street", "Project X"], correctIndex: 0 },
    { frame: "../../../assets/movies/10.mp4", options: ["1917", "Saving Private Ryan", "Hacksaw Ridge", "Fury"], correctIndex: 2 },
  ];

  const quizPanel = document.getElementById("quizPanel");
  const resultPanel = document.getElementById("resultPanel");

  const qTitle = document.getElementById("qTitle");
  const frameVideo = document.getElementById("frameVideo");
  const optionsEl = document.getElementById("options");
  const nextBtn = document.getElementById("nextBtn");
  const playOverlayBtn = document.getElementById("videoPlayBtn");

  const rName = document.getElementById("rName");
  const rTotal = document.getElementById("rTotal");
  const rCorrect = document.getElementById("rCorrect");
  const rAcc = document.getElementById("rAcc");

  const genBtn = document.getElementById("genBtn");
  const cardZone = document.getElementById("cardZone");
  const cardCanvas = document.getElementById("cardCanvas");
  const dlBtn = document.getElementById("dlBtn");

  // ✅ review elements
  const reviewBox = document.getElementById("reviewBox");
  const reviewList = document.getElementById("reviewList");

  const criticalOk = !!(quizPanel && qTitle && frameVideo && optionsEl && nextBtn && playOverlayBtn && resultPanel);
  if (!criticalOk) {
    console.error("[Movie Quiz] Missing critical DOM nodes. Check IDs in movie.html.");
    return;
  }

  const saved = safeJSONParse(localStorage.getItem(MB_KEYS.resMovie), null);
  const done = localStorage.getItem(MB_KEYS.doneMovie) === "1";

  let idx = 0;
  let correct = 0;
  let selectedIndex = null;
  let answers = [];

  // ===== Overlay + sound policy =====
  let soundUnlocked = false;

  function showOverlay() { playOverlayBtn.classList.remove("isHidden"); }
  function hideOverlay() { playOverlayBtn.classList.add("isHidden"); }

  async function playWithSound() {
    if (!frameVideo) return;

    if (!soundUnlocked) {
      soundUnlocked = true;
      frameVideo.muted = false;
      frameVideo.volume = 1.0;
    } else {
      frameVideo.muted = false;
    }

    try {
      await frameVideo.play();
      hideOverlay();
    } catch (e) {
      console.warn("Play failed:", e);
      showOverlay();
    }
  }

  function pauseVideo() {
    if (!frameVideo) return;
    try { frameVideo.pause(); } catch {}
    showOverlay();
  }

  function togglePlayPauseFromClick() {
    if (!frameVideo) return;

    if (frameVideo.ended) {
      try { frameVideo.currentTime = 0; } catch {}
      playWithSound();
      return;
    }

    if (frameVideo.paused) playWithSound();
    else pauseVideo();
  }

  playOverlayBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    togglePlayPauseFromClick();
  });

  frameVideo.addEventListener("click", (e) => {
    e.preventDefault();
    togglePlayPauseFromClick();
  });

  frameVideo.addEventListener("play", () => hideOverlay());
  frameVideo.addEventListener("pause", () => showOverlay());
  frameVideo.addEventListener("ended", () => showOverlay());

  // ===== Review helpers =====
  function showReview() {
    if (!reviewBox) return;
    reviewBox.style.display = "block";
    reviewBox.classList.remove("isHidden");
    reviewBox.classList.remove("isGone");
  }

  function hideReviewAnimatedForever() {
    localStorage.setItem(MB_KEYS.reviewHiddenMovie, "1");

    if (!reviewBox) return;
    reviewBox.classList.add("isHidden");

    window.setTimeout(() => {
      reviewBox.classList.add("isGone");
      reviewBox.style.display = "none";
    }, 220);
  }

  function renderAnswerReviewMovie(ans = []) {
    if (!reviewBox || !reviewList) return;

    const hidden = localStorage.getItem(MB_KEYS.reviewHiddenMovie) === "1";
    if (hidden) {
      reviewBox.classList.add("isGone");
      reviewBox.style.display = "none";
      return;
    }

    reviewList.innerHTML = "";

    QUESTIONS.forEach((q, i) => {
      const correctLabel = q.options?.[q.correctIndex] ?? "—";

      const item = document.createElement("div");
      item.className = "reviewItem";

      const picked = (ans && ans.length) ? ans[i] : undefined;
      if (picked !== undefined && picked !== null && picked !== q.correctIndex) {
        item.classList.add("isWrong");
      }

      const qEl = document.createElement("div");
      qEl.className = "reviewQ";
      qEl.textContent = `QUESTION ${i + 1}`;

      const right = document.createElement("div");

      const aEl = document.createElement("div");
      aEl.className = "reviewA";
      aEl.textContent = correctLabel;

      right.appendChild(aEl);

      item.appendChild(qEl);
      item.appendChild(right);
      reviewList.appendChild(item);
    });

    showReview();
  }

  // ===== Init state =====
  if (done && saved) {
    clearProgressMovie();
    showResult(saved);
  } else {
    const prog = loadProgressMovie();
    if (prog) {
      idx = prog.idx;
      correct = prog.correct;
      answers = prog.answers;
    }
    saveProgressMovie(idx, correct, answers);
    renderQuestion();
  }

  window.addEventListener("beforeunload", () => {
    if (localStorage.getItem(MB_KEYS.doneMovie) !== "1") {
      saveProgressMovie(idx, correct, answers);
    }
  });

  function renderQuestion() {
    selectedIndex = null;
    nextBtn.disabled = true;
    nextBtn.classList.remove("isShow");

    const q = QUESTIONS[idx];
    qTitle.textContent = `Question ${idx + 1} of ${QUESTIONS.length}`;

    frameVideo.pause();
    frameVideo.muted = true;

    frameVideo.src = q.frame;
    frameVideo.load();
    showOverlay();

    const onMeta = () => {
      frameVideo.removeEventListener("loadedmetadata", onMeta);
      try { frameVideo.currentTime = 0.001; } catch {}
      frameVideo.pause();
      showOverlay();
    };
    frameVideo.addEventListener("loadedmetadata", onMeta);

    optionsEl.innerHTML = "";
    (q.options || []).forEach((label, i) => {
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

    saveProgressMovie(idx, correct, answers);
  }

  function updateSelectedUI() {
    [...optionsEl.querySelectorAll(".optionBtn")].forEach((b, i) => {
      b.classList.toggle("isSelected", i === selectedIndex);
    });
  }

  nextBtn.addEventListener("click", () => {
    if (selectedIndex === null) return;

    pauseVideo();

    const q = QUESTIONS[idx];
    answers[idx] = selectedIndex;
    if (selectedIndex === q.correctIndex) correct++;

    idx++;
    if (idx < QUESTIONS.length) {
      saveProgressMovie(idx, correct, answers);
      renderQuestion();
      return;
    }

    const total = QUESTIONS.length;
    const acc = Math.round((correct / total) * 100);
    const p = getProfile();

    const old = safeJSONParse(localStorage.getItem(MB_KEYS.resMovie), null);
    const id = old?.id || buildId("MagicViewer");

    const result = { total, correct, acc, answers: Array.isArray(answers) ? answers : [], name: p?.name || "Player", id, ts: Date.now() };

    localStorage.setItem(MB_KEYS.doneMovie, "1");
    localStorage.setItem(MB_KEYS.resMovie, JSON.stringify(result));

    clearProgressMovie();
    showResult(result);
  });

  function showResult(result) {
    quizPanel.style.display = "none";
    resultPanel.style.display = "block";

    if (rName) rName.textContent = result.name || "Player";
    if (rTotal) rTotal.textContent = String(result.total);
    if (rCorrect) rCorrect.textContent = String(result.correct);
    if (rAcc) rAcc.textContent = `${result.acc}%`;

    renderAnswerReviewMovie((result && result.answers) ? result.answers : answers);
  }

  genBtn?.addEventListener("click", async () => {
    // ✅ hide review forever
    hideReviewAnimatedForever();

    const p = getProfile();
    const r = safeJSONParse(localStorage.getItem(MB_KEYS.resMovie), null);
    if (!r || !cardCanvas) return;

    await drawQuizResultCard(cardCanvas, {
      title: "Guess the Movie by the Frame",
      name: p?.name || "Player",
      avatar: p?.avatar || "",
      correct: r.correct,
      total: r.total,
      acc: r.acc,
      idText: r.id || buildId("MagicViewer"),
      logoSrc: "../../../assets/logo.webm",
    });

    cardZone?.classList.add("isOpen");
    if (dlBtn) dlBtn.disabled = false;

    try {
      const prev = exportPreviewDataURL(cardCanvas, 520, 0.85);
      localStorage.setItem(MB_KEYS.prevMovie, prev);
      localStorage.removeItem("mb_png_movie");
    } catch (e) {
      console.warn("Movie preview save failed:", e);
      try { localStorage.removeItem(MB_KEYS.prevMovie); } catch {}
    }

    if (genBtn) genBtn.textContent = "Regenerate Result Card";
    cardZone?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  dlBtn?.addEventListener("click", async () => {
    if (!cardCanvas) return;

    const p = getProfile();
    const r = safeJSONParse(localStorage.getItem(MB_KEYS.resMovie), null);
    if (!r) return;

    await drawQuizResultCard(cardCanvas, {
      title: "Guess the Movie by the Frame",
      name: p?.name || "Player",
      avatar: p?.avatar || "",
      correct: r.correct,
      total: r.total,
      acc: r.acc,
      idText: r.id || buildId("MagicViewer"),
      logoSrc: "../../../assets/logo.webm",
    });

    const a = document.createElement("a");
    a.download = "magicblock-movie-result.png";
    a.href = cardCanvas.toDataURL("image/png");
    a.click();
  });

  restoreQuizPreview(MB_KEYS.prevMovie, cardCanvas, cardZone, dlBtn, genBtn);
});

/* ===== preview helpers + canvas helpers (unchanged) ===== */
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
    console.warn("restore movie preview failed:", e);
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
   CANVAS DRAW (Movie)
========================= */
async function drawQuizResultCard(canvas, d){
  const ctx = canvas.getContext("2d");

  canvas.width = 1600;
  canvas.height = 900;

  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);

  const card = { x: 0, y: 0, w: W, h: H, r: 96 };

  drawRoundedRect(ctx, card.x, card.y, card.w, card.h, card.r);
  ctx.fillStyle = "#BFC0C2";
  ctx.fill();

  const vg = ctx.createRadialGradient(W*0.52, H*0.38, 140, W*0.52, H*0.38, W*0.95);
  vg.addColorStop(0, "rgba(255,255,255,.22)");
  vg.addColorStop(1, "rgba(0,0,0,.12)");
  ctx.fillStyle = vg;
  ctx.fillRect(0,0,W,H);

  addNoise(ctx, 0, 0, W, H, 0.055);

  const padX = 130;
  const padTop = 120;

  const logoBox = { x: padX, y: padTop - 55, w: 380, h: 120 };
  const logoBitmap = await loadWebmFrameAsBitmap(d.logoSrc || "../../../assets/logo.webm", 0.05);
  if (logoBitmap) drawContainBitmap(ctx, logoBitmap, logoBox.x, logoBox.y, logoBox.w, logoBox.h);

  const title = d.title || "Guess the Movie by the Frame";
  const titleLeft  = logoBox.x + logoBox.w + 70;
  const titleRight = W - padX;
  const titleMaxW  = Math.max(260, titleRight - titleLeft);

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
  const rightX   = W - padX;

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
  ctx.fillText(d.idText || "MB-MagicViewer-XXXXX", pillX + 30, pillY + pillH/2);

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(0,0,0,.34)";
  ctx.font = "900 24px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(`Accuracy: ${d.acc}%`, avatarBox.x, H - 56);
}

function drawRoundedRect(ctx, x, y, w, h, r){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr, y);
  ctx.arcTo(x+w, y, x+w, y+h, rr);
  ctx.arcTo(x+w, y+h, x, y+h, rr);
  ctx.arcTo(x, y+h, x, y, rr);
  ctx.arcTo(x, y, x+w, y, rr);
  ctx.closePath();
}

function fitText(ctx, text, maxPx, minPx, maxW, weight="900"){
  for (let px=maxPx; px>=minPx; px--){
    const f = `${weight} ${px}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
    ctx.font = f;
    if (ctx.measureText(text).width <= maxW) return f;
  }
  return `${weight} ${minPx}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
}

async function drawAvatarRounded(ctx, dataUrl, x, y, w, h, r){
  ctx.save();
  drawRoundedRect(ctx, x, y, w, h, r);
  ctx.clip();

  ctx.fillStyle = "rgba(255,255,255,.18)";
  ctx.fillRect(x,y,w,h);

  if (dataUrl && dataUrl.startsWith("data:")){
    const img = await loadImage(dataUrl);
    drawCoverImage(ctx, img, x, y, w, h);
  }
  ctx.restore();
}

function drawCoverImage(ctx, img, x, y, w, h){
  const sw = img.naturalWidth || img.width;
  const sh = img.naturalHeight || img.height;
  if (!sw || !sh) return;

  const s = Math.max(w/sw, h/sh);
  const dw = sw*s;
  const dh = sh*s;
  const dx = x + (w - dw)/2;
  const dy = y + (h - dh)/2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function drawContainBitmap(ctx, bmp, x, y, w, h){
  const sw = bmp.width, sh = bmp.height;
  if (!sw || !sh) return;

  const s = Math.min(w/sw, h/sh);
  const dw = sw*s;
  const dh = sh*s;
  const dx = x + (w - dw)/2;
  const dy = y + (h - dh)/2;
  ctx.drawImage(bmp, dx, dy, dw, dh);
}

function loadImage(src){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadWebmFrameAsBitmap(src, t=0.05){
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.crossOrigin = "anonymous";
    v.preload = "auto";
    v.src = src;

    const cleanup = () => {
      try{ v.pause(); }catch{}
      v.src = "";
    };

    v.addEventListener("error", () => { cleanup(); resolve(null); }, { once:true });

    v.addEventListener("loadedmetadata", async () => {
      try{
        const tt = Math.min(Math.max(t, 0), Math.max(0.01, (v.duration || 1) - 0.01));
        v.currentTime = tt;

        v.addEventListener("seeked", async () => {
          try{
            const vw = v.videoWidth, vh = v.videoHeight;
            if (!vw || !vh){ cleanup(); resolve(null); return; }

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
        }, { once:true });

      } catch {
        cleanup();
        resolve(null);
      }
    }, { once:true });
  });
}

function addNoise(ctx, x, y, w, h, alpha=0.06){
  const img = ctx.getImageData(x,y,w,h);
  const d = img.data;
  for (let i=0; i<d.length; i+=4){
    const n = (Math.random()*255)|0;
    d[i]   = d[i]   + (n - 128)*alpha;
    d[i+1] = d[i+1] + (n - 128)*alpha;
    d[i+2] = d[i+2] + (n - 128)*alpha;
  }
  ctx.putImageData(img, x, y);
}
