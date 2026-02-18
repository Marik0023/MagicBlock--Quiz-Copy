localStorage.setItem("mb_last_s2", "Song Quiz");

function showMediaHint(msg){
  let el = document.getElementById("mediaHint");
  if (!el){
    el = document.createElement("div");
    el.id = "mediaHint";
    el.style.marginTop = "10px";
    el.style.fontSize = "12px";
    el.style.opacity = "0.8";
    const hero = document.querySelector(".quizHero");
    if (hero) hero.appendChild(el);
  }
  el.textContent = msg || "Tap anywhere to enable audio/video.";
  el.style.display = "block";
}

// quizzes/song.js

const MB_KEYS = {
  profile: "mb_profile",

  // Season 2 keys (must match seasons/s2/app.js)
  doneSong: "mb_s2_done_song",
  resSong: "mb_s2_result_song",
  prevSong: "mb_s2_prev_song",

  // HOME progress
  progSong: "mb_s2_prog_song",
  progSongState: "mb_s2_prog_song_state", // JSON { idx, correct, answers }

  // ✅ Answer Review: hide forever after Generate
  reviewSongHidden: "mb_s2_review_song_hidden",
};

const PNG_KEY = "mb_s2_png_song";

const QUIZ_CARD = {
  title: "Guess the Song by the Melody",
  idPrefix: "MagicListener",
};

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
  } catch (e){
    // QuotaExceededError or similar
    try { freeStorageSpaceS2(); } catch {}
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e2){
      return false;
    }
  }
}


function getProfile() {
  return safeJSONParse(localStorage.getItem(MB_KEYS.profile), null);
}

function forcePlayAll(selector) {
  const vids = document.querySelectorAll(selector);
  if (!vids.length) return;
  const reminder = () => vids.forEach(v => v.play().catch(() => {}));
  reminder();
  window.addEventListener("click", reminder, { once: true });
  window.addEventListener("touchstart", reminder, { once: true });
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

/* =========================
   HOME Progress (Song)
========================= */
function saveProgressSong(idx, correct, answers) {
  const clampedIdx = Math.max(0, Math.min(9, Number(idx) || 0));
  const qNum = clampedIdx + 1;

  localStorage.setItem(MB_KEYS.progSong, String(qNum));
  localStorage.setItem(
    MB_KEYS.progSongState,
    JSON.stringify({
      idx: clampedIdx,
      correct: Number.isFinite(correct) ? correct : 0,
      answers: Array.isArray(answers) ? answers : [],
    })
  );
}

function loadProgressSong() {
  const qNum = Number(localStorage.getItem(MB_KEYS.progSong) || "0");
  const state = safeJSONParse(localStorage.getItem(MB_KEYS.progSongState), null);
  if (!Number.isFinite(qNum) || qNum <= 0) return null;

  const idx = Number.isFinite(state?.idx) ? state.idx : (qNum - 1);
  const correct = Number.isFinite(state?.correct) ? state.correct : 0;
  const answers = Array.isArray(state?.answers) ? state.answers : [];

  return {
    idx: Math.max(0, Math.min(9, idx)),
    correct,
    answers,
  };
}

function clearProgressSong() {
  localStorage.removeItem(MB_KEYS.progSong);
  localStorage.removeItem(MB_KEYS.progSongState);
}

/* =========================
   VINYL helpers (smooth)
========================= */
function setVinylRotationByTime(audioEl, vinylEl, turns = 8, timeOverride = null) {
  if (!audioEl || !vinylEl) return;

  const dur = audioEl.duration;
  if (!isFinite(dur) || dur <= 0) {
    vinylEl.style.transform = "rotate(0deg)";
    return;
  }

  const t = (timeOverride == null) ? (audioEl.currentTime || 0) : timeOverride;
  const clampedT = Math.max(0, Math.min(dur, t));
  const p = clampedT / dur; // 0..1
  const deg = p * 360 * turns;

  vinylEl.style.transform = `rotate(${deg}deg)`;
}

document.addEventListener("DOMContentLoaded", () => {
  forcePlayAll(".bg__video");
  forcePlayAll(".brand__logo");
  renderTopProfile();

  // Topbar navigation
  const achievementsBtn = document.getElementById("achievementsBtn");
  if (achievementsBtn) achievementsBtn.addEventListener("click", () => (location.href = "../index.html#achievements"));

  // Seasons dropdown (hover on desktop, click on mobile)
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
  
  const QUESTIONS = [
    { audio: "../../../assets/songs/11.mp3", options: ["“Diamonds” — Rihanna", "“Halo” — Beyoncé", "“Royals” — Lorde", "“Umbrella” — Rihanna"], correctIndex: 0 },
    { audio: "../../../assets/songs/12.mp3", options: ["“Numb” — Linkin Park", "“Bring Me to Life” — Evanescence", "“Boulevard of Broken Dreams” — Green Day", "“In the End” — Linkin Park"], correctIndex: 3 },
    { audio: "../../../assets/songs/13.mp3", options: ["“Someone You Loved” — Lewis Capaldi", "“Let Her Go” — Passenger", "“Memories” — Maroon 5", "“Sugar” — Maroon 5"], correctIndex: 2 },
    { audio: "../../../assets/songs/14.mp3", options: ["“Basket Case” — Green Day", "“Smells Like Teen Spirit” — Nirvana", "“Come as You Are” — Nirvana", "“Creep” — Radiohead"], correctIndex: 1 },
    { audio: "../../../assets/songs/15.mp3", options: ["“rockstar” — Post Malone (feat. 21 Savage)", "“God’s Plan” — Drake", "“SICKO MODE” — Travis Scott", "“Sunflower” — Post Malone & Swae Lee"], correctIndex: 0 },
    { audio: "../../../assets/songs/16.mp3", options: ["“bad guy” — Billie Eilish", "“Location” — Khalid", "“ocean eyes” — Billie Eilish", "“lovely” — Billie Eilish & Khalid"], correctIndex: 3 },
    { audio: "../../../assets/songs/17.mp3", options: ["“Thunder” — Imagine Dragons", "“Centuries” — Fall Out Boy", "“Believer” — Imagine Dragons", "“Radioactive” — Imagine Dragons"], correctIndex: 2 },
    { audio: "../../../assets/songs/18.mp3", options: ["“Candy Shop” — 50 Cent", "“In da Club” — 50 Cent", "“Yeah!” — Usher (feat. Lil Jon & Ludacris)", "“Drop It Like It’s Hot” — Snoop Dogg (feat. Pharrell)"], correctIndex: 1 },
    { audio: "../../../assets/songs/19.mp3", options: ["“Billie Jean” — Michael Jackson", "“Beat It” — Michael Jackson", "“Smooth Criminal” — Michael Jackson", "“Thriller” — Michael Jackson"], correctIndex: 0 },
    { audio: "../../../assets/songs/20.mp3", options: ["“Stan” — Eminem", "“Till I Collapse” — Eminem", "“Stronger” — Kanye West", "“Lose Yourself” — Eminem"], correctIndex: 3 },
  ];


  const quizPanel = document.getElementById("quizPanel");
  const resultPanel = document.getElementById("resultPanel");

  const qTitle = document.getElementById("qTitle");
  const optionsEl = document.getElementById("options");
  const nextBtn = document.getElementById("nextBtn");

  const audio = document.getElementById("audio");
  const playBtn = document.getElementById("playBtn");
  const seekBar = document.getElementById("seekBar");
  const volBar = document.getElementById("volBar");
  const playerTime = document.getElementById("playerTime");
  const vinyl = document.getElementById("vinyl");

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

  const criticalOk = !!(quizPanel && qTitle && optionsEl && nextBtn && audio && playBtn && seekBar && playerTime && vinyl);
  if (!criticalOk) {
    console.error("[Song Quiz] Missing critical DOM nodes. Check IDs in song.html.");
    return;
  }

  // ===== Volume (без mute) =====
  audio.volume = 0.8;
  if (volBar) {
    volBar.value = String(Math.round(audio.volume * 100));
    volBar.addEventListener("input", () => {
      const v = Math.max(0, Math.min(1, Number(volBar.value) / 100));
      audio.volume = v;
    });
  }

  // how many turns for whole track
  const TURNS_PER_TRACK = 7;

  // --- smooth clock ---
  const smooth = { running: false, baseT: 0, baseP: 0 };

  function smoothStart() {
    smooth.running = true;
    smooth.baseT = audio.currentTime || 0;
    smooth.baseP = performance.now();
  }
  function smoothStop() {
    smooth.running = false;
  }
  function smoothResync() {
    smooth.baseT = audio.currentTime || 0;
    smooth.baseP = performance.now();
  }
  function getSmoothTime() {
    if (!smooth.running) return audio.currentTime || 0;

    const now = performance.now();
    const rate = audio.playbackRate || 1;
    let t = smooth.baseT + ((now - smooth.baseP) / 1000) * rate;

    const real = audio.currentTime || 0;
    if (isFinite(real) && Math.abs(real - t) > 0.18) {
      smooth.baseT = real;
      smooth.baseP = now;
      t = real;
    }
    return t;
  }

  // --- RAF loop for vinyl ---
  let rafId = null;

  function startVinylRAF() {
    if (rafId) return;
    vinyl.classList.add("isPlaying");
    smoothStart();

    const tick = () => {
      const t = getSmoothTime();
      setVinylRotationByTime(audio, vinyl, TURNS_PER_TRACK, t);

      if (!audio.paused && !audio.ended) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = null;
      }
    };

    rafId = requestAnimationFrame(tick);
  }

  function stopVinylRAF() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    vinyl.classList.remove("isPlaying");
    smoothStop();
  }

  function resetPlayer() {
    stopVinylRAF();
    try { audio.pause(); } catch {}
    audio.currentTime = 0;
    seekBar.value = "0";
    playBtn.textContent = "▶";
    playerTime.textContent = "0:00 / 0:00";
    vinyl.style.transform = "rotate(0deg)";
  }

  // ---------- REVIEW helpers ----------
  function showReview() {
    if (!reviewBox) return;
    reviewBox.style.display = "block";
    reviewBox.classList.remove("isHidden");
    reviewBox.classList.remove("isGone");
  }

  function hideReviewAnimatedForever() {
    // ✅ persist forever
    localStorage.setItem(MB_KEYS.reviewSongHidden, "1");

    if (!reviewBox) return;

    reviewBox.classList.add("isHidden");

    window.setTimeout(() => {
      reviewBox.classList.add("isGone");
      reviewBox.style.display = "none";
    }, 220);
  }

  function renderAnswerReviewSong(ans = []) {
    if (!reviewBox || !reviewList) return;

    const hidden = localStorage.getItem(MB_KEYS.reviewSongHidden) === "1";
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
      qEl.textContent = `Question ${i + 1}`;

      const aEl = document.createElement("div");
      aEl.className = "reviewA";
      aEl.textContent = correctLabel;

      item.appendChild(qEl);
      item.appendChild(aEl);
      reviewList.appendChild(item);
    });

    showReview();
  }

  // ---------- QUIZ STATE ----------
  let idx = 0;
  let correct = 0;
  let selectedIndex = null;
  let answers = [];

  const savedRes = safeJSONParse(localStorage.getItem(MB_KEYS.resSong), null);
  const done = localStorage.getItem(MB_KEYS.doneSong) === "1";

  if (done && savedRes) {
    // ensure id stable
    if (!savedRes.id) {
      savedRes.id = ensureResultId(QUIZ_CARD.idPrefix, savedRes.id);
      localStorage.setItem(MB_KEYS.resSong, JSON.stringify(savedRes));
    }
    clearProgressSong();
    showResult(savedRes);
  } else {
    const prog = loadProgressSong();
    if (prog) {
      idx = prog.idx;
      correct = prog.correct;
      answers = prog.answers;
    }
    saveProgressSong(idx, correct, answers);
    renderQuestion();
  }

  window.addEventListener("beforeunload", () => {
    if (localStorage.getItem(MB_KEYS.doneSong) === "1") return;
    saveProgressSong(idx, correct, answers);
  });

  // ---------- PLAYER EVENTS ----------
  playBtn.addEventListener("click", async () => {
    try {
      if (audio.paused) await audio.play().catch(()=>showMediaHint("Tap to enable media."));
      else audio.pause();
    } catch {}
    syncPlayUI();
  });

  audio.addEventListener("play", () => {
    startVinylRAF();
    syncPlayUI();
  });

  audio.addEventListener("pause", () => {
    stopVinylRAF();
    setVinylRotationByTime(audio, vinyl, TURNS_PER_TRACK, audio.currentTime || 0);
    syncPlayUI();
  });

  audio.addEventListener("ended", () => {
    resetPlayer();
    syncPlayUI();
  });

  audio.addEventListener("loadedmetadata", () => {
    updateTime();
    setVinylRotationByTime(audio, vinyl, TURNS_PER_TRACK, 0);
  });

  audio.addEventListener("timeupdate", () => {
    updateTime();
    if (isFinite(audio.duration) && audio.duration > 0) {
      seekBar.value = String(Math.round((audio.currentTime / audio.duration) * 100));
    } else {
      seekBar.value = "0";
    }
  });

  seekBar.addEventListener("input", () => {
    if (!isFinite(audio.duration) || audio.duration <= 0) return;

    const t = (Number(seekBar.value) / 100) * audio.duration;
    audio.currentTime = t;

    if (!audio.paused) {
      smoothResync();
      startVinylRAF();
    } else {
      setVinylRotationByTime(audio, vinyl, TURNS_PER_TRACK, t);
    }
    updateTime();
  });

  function syncPlayUI() {
    playBtn.textContent = audio.paused ? "▶" : "⏸";
  }

  function formatTime(s) {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${m}:${String(r).padStart(2, "0")}`;
  }

  function updateTime() {
    playerTime.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
  }

  // ---------- QUIZ ----------
  function renderQuestion() {
    const q = QUESTIONS[idx];
    if (!q) return;

    selectedIndex = null;
    nextBtn.disabled = true;
    nextBtn.classList.remove("isShow");

    qTitle.textContent = `Question ${idx + 1} of ${QUESTIONS.length}`;

    resetPlayer();
    audio.src = q.audio || "";

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

    saveProgressSong(idx, correct, answers);
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
      saveProgressSong(idx, correct, answers);
      renderQuestion();
      return;
    }

    const total = QUESTIONS.length;
    const acc = Math.round((correct / total) * 100);
    const p = getProfile();

    const result = {
      total,
      correct,
      acc,
      answers: Array.isArray(answers) ? answers : [],
      name: p?.name || "Player",
      id: ensureResultId(QUIZ_CARD.idPrefix, savedRes?.id || null),
      ts: Date.now(),
    };

    localStorage.setItem(MB_KEYS.doneSong, "1");
    localStorage.setItem(MB_KEYS.resSong, JSON.stringify(result));

    clearProgressSong();
    showResult(result);
  });

  function showResult(result) {
    quizPanel.style.display = "none";
    if (resultPanel) resultPanel.style.display = "block";

    if (rName) rName.textContent = result.name || "Player";
    if (rTotal) rTotal.textContent = String(result.total);
    if (rCorrect) rCorrect.textContent = String(result.correct);
    if (rAcc) rAcc.textContent = `${result.acc}%`;

    // ✅ show review only if not hidden forever
    const hidden = localStorage.getItem(MB_KEYS.reviewSongHidden) === "1";
    if (!hidden) renderAnswerReviewSong((result && result.answers) ? result.answers : answers);
    else if (reviewBox) {
      reviewBox.classList.add("isGone");
      reviewBox.style.display = "none";
    }
  }

  // ✅ Generate Result Card: hide review forever
  genBtn?.addEventListener("click", async () => {
    hideReviewAnimatedForever();
    if (!cardCanvas) return;

    const p = getProfile();
    const r = safeJSONParse(localStorage.getItem(MB_KEYS.resSong), null);
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

    cardZone?.classList.add("isOpen");
    if (dlBtn) dlBtn.disabled = false;

    try {
      const prev = exportPreviewDataURL(cardCanvas, 520, 0.85);
      setItemWithRetryS2(MB_KEYS.prevSong, prev);
    } catch (e) {
      console.warn("Song preview save failed:", e);
      try { localStorage.removeItem(MB_KEYS.prevSong); } catch {}
    }

    if (genBtn) genBtn.textContent = "Regenerate Result Card";
    cardZone?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  dlBtn?.addEventListener("click", async () => {
    if (!cardCanvas) return;

    const p = getProfile();
    const r = safeJSONParse(localStorage.getItem(MB_KEYS.resSong), null);
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
    a.download = "magicblock-song-result.png";
    a.href = cardCanvas.toDataURL("image/png");
    a.click();
  });

  restoreQuizPreview(MB_KEYS.prevSong, cardCanvas, cardZone, dlBtn, genBtn);
});

/* =========================
   CANVAS DRAW (Song) + helpers
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

  const title = d.title || "Guess the Song by the Melody";
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
  ctx.fillText(d.idText || "MB-MagicListener-XXXXX", pillX + 30, pillY + pillH / 2);

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(0,0,0,.34)";
  ctx.font = "900 24px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(`Accuracy: ${d.acc}%`, avatarBox.x, H - 56);
}

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
    console.warn("restore song preview failed:", e);
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

  if (dataUrl) {
    try {
      const img = await loadImage(dataUrl);
      drawCoverImage(ctx, img, x, y, w, h);
    } catch {}
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
    if (typeof src === "string" && src && !src.startsWith("data:")) img.crossOrigin = "anonymous";
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


function injectBreadcrumb(){
  const hero = document.querySelector(".quizHero");
  if (!hero) return;
  const crumbs = document.createElement("div");
  crumbs.className = "crumbs";
  crumbs.innerHTML = `<a href="../../../index.html">All Seasons</a> / <a href="../index.html">Season 2</a> / <span>Song Quiz</span>`;
  hero.insertBefore(crumbs, hero.firstChild);
}

document.addEventListener("DOMContentLoaded", () => {
  injectBreadcrumb();});

