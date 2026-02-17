// Season 2 — Guess the Character by Silhouette
localStorage.setItem("mb_last_s2", "Silhouette");

const MB_KEYS = {
  profile: "mb_profile",

  // Season 2 keys (must match seasons/s2/app.js)
  doneMovie: "mb_s2_done_silhouette",
  resMovie: "mb_s2_result_silhouette",
  prevMovie: "mb_s2_prev_silhouette",

  // Progress
  progMovie: "mb_s2_prog_silhouette",            // number (1..10)
  progMovieState: "mb_s2_prog_silhouette_state", // JSON { idx, correct, answers }

  // Answer Review: hide forever after Generate
  reviewHiddenMovie: "mb_s2_review_hidden_silhouette",
};

const PNG_KEY = "mb_s2_png_silhouette";

const QUIZ_META = {
  title: "Guess the Character by Silhouette",
  idPrefix: "MagicShadow",
  total: 10,
};

const QUESTIONS = [
  {
    img: "../assets/silhouettes/spongebob.png",
    options: [
      "Finn (Adventure Time)",
      "Stewie Griffin (Family Guy)",
      "Gumball Watterson (The Amazing World of Gumball)",
      "SpongeBob SquarePants (SpongeBob SquarePants)",
    ],
    correctIndex: 3,
  },
  {
    img: "../assets/silhouettes/shrek.png",
    options: [
      "Sulley (Monsters, Inc.)",
      "Gru (Despicable Me)",
      "Po (Kung Fu Panda)",
      "Shrek (Shrek)",
    ],
    correctIndex: 3,
  },
  {
    img: "../assets/silhouettes/walle.png",
    options: [
      "Astro Boy (Astro Boy)",
      "Gir (Invader Zim)",
      "BMO (Adventure Time)",
      "WALL·E (WALL·E)",
    ],
    correctIndex: 3,
  },
  {
    img: "../assets/silhouettes/toothless.png",
    options: [
      "Charizard (Pokémon)",
      "Spyro (Spyro)",
      "Mushu (Mulan)",
      "Toothless (How to Train Your Dragon)",
    ],
    correctIndex: 3,
  },
  {
    img: "../assets/silhouettes/pikachu.png",
    options: [
      "Sonic the Hedgehog (Sonic)",
      "Kirby (Kirby: Right Back at Ya!)",
      "Doraemon (Doraemon)",
      "Pikachu (Pokémon)",
    ],
    correctIndex: 3,
  },
  {
    img: "../assets/silhouettes/homer.png",
    options: [
      "Peter Griffin (Family Guy)",
      "Stan Smith (American Dad!)",
      "Bob Belcher (Bob’s Burgers)",
      "Homer Simpson (The Simpsons)",
    ],
    correctIndex: 3,
  },
  {
    img: "../assets/silhouettes/rick.png",
    options: [
      "Professor Farnsworth (Futurama)",
      "Dexter (Dexter’s Laboratory)",
      "Dr. Doofenshmirtz (Phineas and Ferb)",
      "Rick Sanchez (Rick and Morty)",
    ],
    correctIndex: 3,
  },
  {
    img: "../assets/silhouettes/aang.png",
    options: [
      "Samurai Jack (Samurai Jack)",
      "Naruto Uzumaki (Naruto)",
      "Steven Universe (Steven Universe)",
      "Aang (Avatar: The Last Airbender)",
    ],
    correctIndex: 3,
  },
  {
    img: "../assets/silhouettes/tomjerry.png",
    options: [
      "Garfield (Garfield)",
      "Sylvester (Looney Tunes)",
      "The Cat in the Hat (The Cat in the Hat)",
      "Tom and Jerry (Tom and Jerry)",
    ],
    correctIndex: 3,
  },
  {
    img: "../assets/silhouettes/scooby.png",
    options: [
      "Brian Griffin (Family Guy)",
      "Goofy (Disney)",
      "Odie (Garfield)",
      "Scooby-Doo (Scooby-Doo)",
    ],
    correctIndex: 3,
  },
];

const REVEAL_MS = 1350;      // reveal animation duration
const POST_REVEAL_MS = 250;   // small pause before loading next question
const SWITCH_FADE_MS = 180;

function safeJSONParse(v, fallback = null) {
  try { return JSON.parse(v); } catch { return fallback; }
}

function freeStorageSpaceS2(){
  // Remove only heavy previews/cards for Season 2 (keep progress/profile)
  const heavyKeys = [
    "mb_s2_prev_movieframe",
    "mb_s2_prev_movieemoji",
    "mb_s2_prev_song",
    "mb_s2_prev_truefalse",
    "mb_s2_prev_silhouette",
    "mb_s2_prev_magicblock",
    "mb_s2_champ_png",
    "mb_s2_champ_ready",
  ];
  for (const k of heavyKeys){
    try { localStorage.removeItem(k); } catch {}
  }
}

function setItemWithRetryS2(key, value){
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    try { freeStorageSpaceS2(); } catch {}
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
}

function getProfile() {
  return safeJSONParse(localStorage.getItem(MB_KEYS.profile), null);
}

/* ===== Progress helpers ===== */
function saveProgress(idx0, correct, answers) {
  const idx = Math.max(0, Math.min(QUESTIONS.length - 1, Number(idx0) || 0));
  const qNum = Math.max(1, Math.min(QUESTIONS.length, idx + 1));

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

function loadProgress() {
  const n = Number(localStorage.getItem(MB_KEYS.progMovie) || "0");
  const state = safeJSONParse(localStorage.getItem(MB_KEYS.progMovieState), null);
  if (!Number.isFinite(n) || n <= 0) return null;

  const fallbackIdx = Math.max(0, Math.min(QUESTIONS.length - 1, n - 1));
  const idx = Number.isFinite(state?.idx) ? state.idx : fallbackIdx;

  return {
    idx: Math.max(0, Math.min(QUESTIONS.length - 1, idx)),
    correct: Number.isFinite(state?.correct) ? state.correct : 0,
    answers: Array.isArray(state?.answers) ? state.answers : [],
  };
}

function clearProgress() {
  localStorage.removeItem(MB_KEYS.progMovie);
  localStorage.removeItem(MB_KEYS.progMovieState);
}

/* ===== ID ===== */
function buildId(prefix) {
  const serial = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `MB-${prefix}-${serial}`;
}

/* ===== Top profile (from topbar.js) ===== */
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
    if (hintEl) hintEl.textContent = "Create one in the home page";
    return;
  }
  if (img && p.avatar) img.src = p.avatar;
  if (nameEl) nameEl.textContent = p.name || "Player";
  if (hintEl) hintEl.textContent = "Edit";
}

/* =========================
   QUIZ LOGIC
========================= */
let idx = 0;
let correct = 0;
let answers = [];
let locked = false;       // locked while revealing / after confirmed
let revealing = false;    // true during reveal animation
let selectedIndex = null; // current selection (not confirmed until Next)
let revealTimer = null;
let quizPanel, resultPanel, qTitle, silImg, optionsEl, feedbackEl, nextBtn;
let rName, rTotal, rCorrect, rAcc, genBtn, dlBtn, cardZone, cardCanvas, reviewBox, reviewList;

function clearRevealTimer() {
  if (revealTimer) {
    clearTimeout(revealTimer);
    revealTimer = null;
  }
}

function setSilhouetteState(revealed){
  if (!silImg) return;
  if (revealed) silImg.classList.add("isRevealed");
  else silImg.classList.remove("isRevealed");
}

function setImage(src){
  if (!silImg) return;
  setSilhouetteState(false);

  // Fade-in per image load
  silImg.style.opacity = "0";
  silImg.style.transform = "scale(0.985)";
  silImg.onload = () => {
    silImg.style.opacity = "1";
    silImg.style.transform = "scale(1)";
  };
  silImg.onerror = () => {
    silImg.style.opacity = "1";
    silImg.style.transform = "scale(1)";
  };
  silImg.src = src;
}

function renderOptions(opts){
  optionsEl.innerHTML = "";
  opts.forEach((txt, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "optionBtn";
    b.textContent = `${String.fromCharCode(65 + i)}) ${txt}`;
    b.addEventListener("click", () => submitAnswer(i));
    optionsEl.appendChild(b);
  });
}

function lockOptions(){
  [...optionsEl.querySelectorAll("button")].forEach(b => b.disabled = true);
}


function renderQuestion() {
  locked = false;
  revealing = false;
  selectedIndex = null;
  clearRevealTimer();

  const q = QUESTIONS[idx];

  qTitle.textContent = `Question ${idx + 1} of ${QUESTIONS.length}`;
  if (feedbackEl) feedbackEl.textContent = "";

  setImage(q.img);
  setSilhouetteState(false);

  renderOptions(q.options);

  if (nextBtn) {
    nextBtn.disabled = true;
    nextBtn.classList.remove("isShow");
  }

  // If user refreshed mid-quiz and this question was already answered:
  const prev = Number.isInteger(answers[idx]) ? answers[idx] : null;
  if (prev !== null) {
    selectedIndex = prev;
    markAnswers(prev);
    lockOptions();
    setSilhouetteState(true);
    locked = true;

    if (nextBtn) {
      nextBtn.disabled = false;
      nextBtn.classList.add("isShow");
    }
  }

  saveProgress(idx, correct, answers);
}

function markAnswers(selected) {
  const buttons = [...optionsEl.querySelectorAll(".optionBtn")];
  buttons.forEach((btn, i) => {
    btn.classList.toggle("isSelected", i === selected);
    btn.classList.remove("isCorrect", "isWrong");
  });
}

function submitAnswer(selected) {
  if (revealing) return;
  if (Number.isInteger(answers[idx])) return; // already confirmed
  selectedIndex = selected;
  markAnswers(selectedIndex);

  if (nextBtn) {
    nextBtn.disabled = false;
    nextBtn.classList.add("isShow");
  }
}

function confirmAndReveal() {
  if (revealing) return;
  if (Number.isInteger(answers[idx])) return; // already confirmed
  if (!Number.isInteger(selectedIndex)) return;

  const q = QUESTIONS[idx];

  // lock UI
  revealing = true;
  locked = true;
  lockOptions();

  // save score once (on confirm)
  answers[idx] = selectedIndex;
  if (selectedIndex === q.correctIndex) correct += 1;

  // reveal (no correct/incorrect messaging)
  setSilhouetteState(true);
  if (feedbackEl) feedbackEl.textContent = "";

  if (nextBtn) {
    nextBtn.disabled = true; // prevent double clicks
    nextBtn.classList.add("isShow");
  }

  saveProgress(idx, correct, answers);

  clearRevealTimer();
  revealTimer = setTimeout(() => {
    goNext();
  }, REVEAL_MS + POST_REVEAL_MS);
}

function goNext(){
  clearRevealTimer();

  if (idx >= QUESTIONS.length - 1){
    finishQuiz();
    return;
  }

  idx += 1;

  // Fade out panel, swap, fade in (small polish)
  if (quizPanel){
    quizPanel.classList.add("isSwitching");
    setTimeout(() => {
      renderQuestion();
      quizPanel.classList.remove("isSwitching");
    }, SWITCH_FADE_MS);
  } else {
    renderQuestion();
  }
}

function finishQuiz(){
  clearRevealTimer();
  clearProgress();

  const p = getProfile();
  const name = p?.name || "Player";
  const avatar = p?.avatar || "";

  const total = QUESTIONS.length;
  const acc = Math.round((correct / total) * 100);

  const result = {
    title: QUIZ_META.title,
    name,
    avatar,
    total,
    correct,
    acc,
    idText: buildId(QUIZ_META.idPrefix),
  };

  // Store “done + result” for the Season index page and future visits
  localStorage.setItem(MB_KEYS.doneMovie, "1");
  localStorage.setItem(MB_KEYS.resMovie, JSON.stringify(result));

  showResult(result);
}

function showResult(result){
  quizPanel.style.display = "none";
  resultPanel.style.display = "block";

  rName.textContent = result.name;
  rTotal.textContent = `${result.total}`;
  rCorrect.textContent = `${result.correct}`;
  rAcc.textContent = `${result.acc}%`;

  // Review list (unless hidden)
  const hideReview = localStorage.getItem(MB_KEYS.reviewHiddenMovie) === "1";
  if (reviewBox){
    reviewBox.style.display = hideReview ? "none" : "block";
  }
  renderReviewList();

  // Try restore previous generated card preview (optional)
  restorePreview();
}

function renderReviewList(){
  if (!reviewList) return;
  reviewList.innerHTML = "";

  QUESTIONS.forEach((q, i) => {
    const row = document.createElement("div");
    row.className = "reviewRow";

    const left = document.createElement("div");
    left.className = "reviewQ";
    left.textContent = `Q${i + 1}`;

    const right = document.createElement("div");
    right.className = "reviewA";
    right.textContent = `Correct: ${String.fromCharCode(65 + q.correctIndex)} — ${q.options[q.correctIndex]}`;

    row.appendChild(left);
    row.appendChild(right);
    reviewList.appendChild(row);
  });
}

function restorePreview(){
  const prev = localStorage.getItem(MB_KEYS.prevMovie);
  if (!prev || !cardCanvas) return false;

  const img = new Image();
  img.onload = () => {
    cardCanvas.width = img.naturalWidth || img.width;
    cardCanvas.height = img.naturalHeight || img.height;
    const ctx = cardCanvas.getContext("2d");
    ctx.clearRect(0, 0, cardCanvas.width, cardCanvas.height);
    ctx.drawImage(img, 0, 0);
    cardZone?.classList.add("isOpen");
    if (dlBtn) dlBtn.disabled = false;
    if (genBtn) genBtn.textContent = "Regenerate Result Card";
  };
  img.onerror = () => {};
  img.src = prev;
  return true;
}

async function handleGenerate(){
  const stored = safeJSONParse(localStorage.getItem(MB_KEYS.resMovie), null);
  if (!stored) return;

  if (genBtn) genBtn.disabled = true;

  await drawQuizResultCard(cardCanvas, {
    title: QUIZ_META.title,
    name: stored.name,
    total: stored.total,
    correct: stored.correct,
    acc: stored.acc,
    idText: stored.idText,
    avatar: stored.avatar,
    logoSrc: "../../../assets/logo.webm",
  });

  const png = cardCanvas.toDataURL("image/png");

  // Save PNG and preview thumbnail
  setItemWithRetryS2(PNG_KEY, png);
  setItemWithRetryS2(MB_KEYS.prevMovie, exportPreviewDataURL(cardCanvas, 520, 0.85));

  cardZone?.classList.add("isOpen");
  if (dlBtn) dlBtn.disabled = false;
  if (genBtn){
    genBtn.disabled = false;
    genBtn.textContent = "Regenerate Result Card";
  }

  // Hide review forever after generate (as requested in other quizzes)
  try {
    localStorage.setItem(MB_KEYS.reviewHiddenMovie, "1");
    if (reviewBox) reviewBox.style.display = "none";
  } catch {}
}

function handleDownload(){
  const png = localStorage.getItem(PNG_KEY);
  if (!png) return;

  const a = document.createElement("a");
  a.href = png;
  a.download = "MagicBlock_S2_Silhouette_Result.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function init(){
  renderTopProfile();

  quizPanel   = document.getElementById("quizPanel");
  resultPanel = document.getElementById("resultPanel");
  qTitle      = document.getElementById("qTitle");
  silImg      = document.getElementById("silImg");
  optionsEl   = document.getElementById("options");
  feedbackEl  = document.getElementById("feedback");
  nextBtn     = document.getElementById("nextBtn");

  rName    = document.getElementById("rName");
  rTotal   = document.getElementById("rTotal");
  rCorrect = document.getElementById("rCorrect");
  rAcc     = document.getElementById("rAcc");

  genBtn    = document.getElementById("genBtn");
  dlBtn     = document.getElementById("dlBtn");
  cardZone  = document.getElementById("cardZone");
  cardCanvas= document.getElementById("cardCanvas");
  reviewBox = document.getElementById("reviewBox");
  reviewList= document.getElementById("reviewList");

  if (nextBtn){
    nextBtn.addEventListener("click", () => {
      // If already answered (e.g. after reload), just go next.
      if (Number.isInteger(answers[idx])) {
        goNext();
        return;
      }
      // Otherwise: confirm -> reveal -> auto next.
      confirmAndReveal();
    });
  }
  if (genBtn) genBtn.addEventListener("click", handleGenerate);
  if (dlBtn) dlBtn.addEventListener("click", handleDownload);

  // Default state
  if (dlBtn) dlBtn.disabled = true;

  // If quiz already completed — show stored result
  const done = localStorage.getItem(MB_KEYS.doneMovie) === "1";
  const res  = safeJSONParse(localStorage.getItem(MB_KEYS.resMovie), null);

  if (done && res){
    showResult(res);
    return;
  }

  // Resume progress if any
  const prog = loadProgress();
  if (prog){
    idx = prog.idx || 0;
    correct = prog.correct || 0;
    answers = Array.isArray(prog.answers) ? prog.answers : [];
  }

  renderQuestion();
}

document.addEventListener("DOMContentLoaded", init);

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

  if (dataUrl){
    try {
      const img = await loadImage(dataUrl);
      drawCoverImage(ctx, img, x, y, w, h);
    } catch {}
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
    if (typeof src === "string" && src && !src.startsWith("data:")) img.crossOrigin = "anonymous";
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


function injectBreadcrumb(){
  const hero = document.querySelector(".quizHero");
  if (!hero) return;
  const crumbs = document.createElement("div");
  crumbs.className = "crumbs";
  crumbs.innerHTML = `<a href="../../../index.html">All Seasons</a> / <a href="../index.html">Season 2</a> / <span>Silhouette</span>`;
  hero.insertBefore(crumbs, hero.firstChild);
}

document.addEventListener("DOMContentLoaded", () => {
  injectBreadcrumb();});

