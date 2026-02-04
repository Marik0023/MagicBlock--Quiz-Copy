const MB_KEYS = {
  profile: "mb_profile",
  doneSong: "mb_done_song",
  resSong: "mb_result_song",
};

const QUIZ_CARD = {
  title: "Guess the Song by the Melody",
  idPrefix: "MagicListener", // MB-MagicListener-XXXXXX
};

function safeJSONParse(v, fallback=null){ try{return JSON.parse(v)}catch{return fallback} }
function getProfile(){ return safeJSONParse(localStorage.getItem(MB_KEYS.profile), null); }

function forcePlayAll(selector){
  const vids = document.querySelectorAll(selector);
  if (!vids.length) return;
  const reminder = () => vids.forEach(v => v.play().catch(()=>{}));
  reminder();
  window.addEventListener("click", reminder, { once:true });
  window.addEventListener("touchstart", reminder, { once:true });
}

function makeSerial(len = 6){
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i=0;i<len;i++) out += chars[Math.floor(Math.random()*chars.length)];
  return out;
}
function ensureResultId(prefix, existing){
  if (existing && typeof existing === "string" && existing.startsWith("MB-")) return existing;
  return `MB-${prefix}-${makeSerial(6)}`;
}

document.addEventListener("DOMContentLoaded", () => {
  forcePlayAll(".bg__video");
  forcePlayAll(".brand__logo");
  renderTopProfile();

  const QUESTIONS = [
    { audio: "../assets/songs/q1.mp3", options: ["A", "B", "C", "D"], correctIndex: 0 },
    { audio: "../assets/songs/q2.mp3", options: ["A", "B", "C", "D"], correctIndex: 1 },
    { audio: "../assets/songs/q3.mp3", options: ["A", "B", "C", "D"], correctIndex: 2 },
    { audio: "../assets/songs/q4.mp3", options: ["A", "B", "C", "D"], correctIndex: 3 },
    { audio: "../assets/songs/q5.mp3", options: ["A", "B", "C", "D"], correctIndex: 0 },
    { audio: "../assets/songs/q6.mp3", options: ["A", "B", "C", "D"], correctIndex: 1 },
    { audio: "../assets/songs/q7.mp3", options: ["A", "B", "C", "D"], correctIndex: 2 },
    { audio: "../assets/songs/q8.mp3", options: ["A", "B", "C", "D"], correctIndex: 3 },
    { audio: "../assets/songs/q9.mp3", options: ["A", "B", "C", "D"], correctIndex: 0 },
    { audio: "../assets/songs/q10.mp3", options: ["A", "B", "C", "D"], correctIndex: 1 },
  ];

  const quizPanel = document.getElementById("quizPanel");
  const resultPanel = document.getElementById("resultPanel");

  const qTitle = document.getElementById("qTitle");
  const progressText = document.getElementById("progressText");
  const optionsEl = document.getElementById("options");
  const nextBtn = document.getElementById("nextBtn");

  const audio = document.getElementById("audio");
  const playBtn = document.getElementById("playBtn");
  const seekBar = document.getElementById("seekBar");
  const playerTime = document.getElementById("playerTime");

  const rName = document.getElementById("rName");
  const rTotal = document.getElementById("rTotal");
  const rCorrect = document.getElementById("rCorrect");
  const rAcc = document.getElementById("rAcc");

  const genBtn = document.getElementById("genBtn");
  const cardZone = document.getElementById("cardZone");
  const cardCanvas = document.getElementById("cardCanvas");
  const dlBtn = document.getElementById("dlBtn");

  const criticalOk = !!(quizPanel && qTitle && progressText && optionsEl && nextBtn && audio);
  if (!criticalOk){
    console.error("[Song Quiz] Missing critical DOM nodes. Check IDs in song.html.");
    return;
  }

  let idx = 0;
  let correct = 0;
  let selectedIndex = null;

  playBtn?.addEventListener("click", async () => {
    try{
      if (audio.paused) await audio.play();
      else audio.pause();
    } catch {}
    syncPlayIcon();
  });

  audio.addEventListener("play", syncPlayIcon);
  audio.addEventListener("pause", syncPlayIcon);

  audio.addEventListener("loadedmetadata", updateTime);
  audio.addEventListener("timeupdate", () => {
    updateTime();
    if (!isNaN(audio.duration) && audio.duration > 0 && seekBar){
      seekBar.value = String(Math.round((audio.currentTime / audio.duration) * 100));
    }
  });

  seekBar?.addEventListener("input", () => {
    if (!isNaN(audio.duration) && audio.duration > 0){
      const t = (Number(seekBar.value) / 100) * audio.duration;
      audio.currentTime = t;
    }
  });

  function syncPlayIcon(){
    if (playBtn) playBtn.textContent = audio.paused ? "▶" : "⏸";
  }
  function formatTime(s){
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${m}:${String(r).padStart(2,"0")}`;
  }
  function updateTime(){
    if (playerTime) playerTime.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
  }

  const saved = safeJSONParse(localStorage.getItem(MB_KEYS.resSong), null);
  const done = localStorage.getItem(MB_KEYS.doneSong) === "1";

  if (done && saved){
    if (!saved.id){
      saved.id = ensureResultId(QUIZ_CARD.idPrefix, saved.id);
      localStorage.setItem(MB_KEYS.resSong, JSON.stringify(saved));
    }
    showResult(saved);
  } else {
    renderQuestion();
  }

  function renderQuestion(){
    const q = QUESTIONS[idx];
    if (!q){
      console.error("[Song Quiz] QUESTIONS is empty or idx out of range.");
      return;
    }

    selectedIndex = null;
    nextBtn.disabled = true;
    nextBtn.classList.remove("isShow");

    qTitle.textContent = `Question ${idx + 1} of ${QUESTIONS.length}`;
    progressText.textContent = `Progress: ${idx + 1} / ${QUESTIONS.length}`;

    audio.pause();
    audio.currentTime = 0;
    audio.src = q.audio || "";
    syncPlayIcon();
    if (seekBar) seekBar.value = "0";
    if (playerTime) playerTime.textContent = "0:00 / 0:00";

    optionsEl.innerHTML = "";
    (q.options || ["A","B","C","D"]).forEach((label, i) => {
      const btn = document.createElement("button");
      btn.className = "optionBtn";
      btn.type = "button";
      btn.textContent = `${String.fromCharCode(65+i)}) ${label}`;

      btn.addEventListener("click", () => {
        selectedIndex = i;
        updateSelectedUI();
        nextBtn.disabled = false;
        nextBtn.classList.add("isShow");
      });

      optionsEl.appendChild(btn);
    });
  }

  function updateSelectedUI(){
    [...optionsEl.querySelectorAll(".optionBtn")].forEach((b, i) => {
      b.classList.toggle("isSelected", i === selectedIndex);
    });
  }

  nextBtn.addEventListener("click", () => {
    if (selectedIndex === null) return;

    const q = QUESTIONS[idx];
    if (selectedIndex === q.correctIndex) correct++;

    idx++;
    if (idx < QUESTIONS.length){
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
      name: p?.name || "Player",
      id: ensureResultId(QUIZ_CARD.idPrefix, null),
      ts: Date.now()
    };

    localStorage.setItem(MB_KEYS.doneSong, "1");
    localStorage.setItem(MB_KEYS.resSong, JSON.stringify(result));

    showResult(result);
  });

  function showResult(result){
    quizPanel.style.display = "none";
    if (resultPanel) resultPanel.style.display = "block";

    rName && (rName.textContent = result.name || "Player");
    rTotal && (rTotal.textContent = String(result.total));
    rCorrect && (rCorrect.textContent = String(result.correct));
    rAcc && (rAcc.textContent = `${result.acc}%`);
  }

  genBtn?.addEventListener("click", async () => {
    if (!cardCanvas) return;
    const p = getProfile();
    const r = safeJSONParse(localStorage.getItem(MB_KEYS.resSong), null);
    if (!r) return;

    await drawQuizResultCard(cardCanvas, {
      quizTitle: QUIZ_CARD.title,
      name: p?.name || "Player",
      avatar: p?.avatar || "",
      scoreText: `${r.correct} / ${r.total}`,
      accuracyText: `${r.acc}%`,
      idText: r.id || ensureResultId(QUIZ_CARD.idPrefix, null),
      logoSrc: "../assets/logo.webm",
    });

    cardZone?.classList.add("isOpen");
    cardZone?.scrollIntoView({ behavior:"smooth", block:"start" });
  });

  dlBtn?.addEventListener("click", () => {
    if (!cardCanvas) return;
    const a = document.createElement("a");
    a.download = "magicblock-song-result.png";
    a.href = cardCanvas.toDataURL("image/png");
    a.click();
  });

  /* =========================
     RESULT CARD (Song) — NO outer frame, NO squish, NO overlaps
  ========================== */

  async function drawQuizResultCard(canvas, d){
    const ctx = canvas.getContext("2d");

    canvas.width = 1600;
    canvas.height = 900;

    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);

    // ✅ fill entire canvas (no transparent border frame)
    const card = { x: 0, y: 0, w: W, h: H, r: 96 };

    // base
    drawRoundedRect(ctx, card.x, card.y, card.w, card.h, card.r);
    ctx.fillStyle = "#BFC0C2";
    ctx.fill();

    // soft vignette
    const vg = ctx.createRadialGradient(
      W*0.52, H*0.38, 140,
      W*0.52, H*0.38, W*0.95
    );
    vg.addColorStop(0, "rgba(255,255,255,.22)");
    vg.addColorStop(1, "rgba(0,0,0,.12)");
    ctx.fillStyle = vg;
    ctx.fillRect(0,0,W,H);

    // decor
    drawWaves(ctx, W-560, 210, 430, 250, 10, 9, 0.10);

    // grain
    addNoise(ctx, 0, 0, W, H, 0.055);

    const padX = 130;
    const padTop = 120;

    // ===== LOGO (contain, no squash) =====
    const logoBox = { x: padX, y: padTop - 55, w: 380, h: 120 };
    const logoBmp = await loadWebmFrameAsBitmap(d.logoSrc || "../assets/logo.webm", 0.05);
    if (logoBmp){
      drawContainBitmap(ctx, logoBmp, logoBox.x, logoBox.y, logoBox.w, logoBox.h);
    }

    // ===== TITLE safe area (never overlaps logo) =====
    const title = d.quizTitle || "Guess the Song by the Melody";
    const titleLeft  = logoBox.x + logoBox.w + 70;
    const titleRight = W - padX;
    const titleMaxW  = Math.max(260, titleRight - titleLeft);

    const titleY = padTop + 10;
    ctx.fillStyle = "rgba(255,255,255,.92)";
    ctx.font = fitText(ctx, title, 76, 52, titleMaxW, "950");
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(title, titleLeft, titleY);

    // ===== AVATAR (cover crop, no squish) =====
    const avatarBox = { x: padX + 10, y: 240, w: 260, h: 260, r: 80 };
    await drawAvatarRoundedCover(ctx, d.avatar, avatarBox.x, avatarBox.y, avatarBox.w, avatarBox.h, avatarBox.r);

    // thin rim
    ctx.save();
    drawRoundedRect(ctx, avatarBox.x, avatarBox.y, avatarBox.w, avatarBox.h, avatarBox.r);
    ctx.strokeStyle = "rgba(255,255,255,.18)";
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.restore();

    // ===== TEXT =====
    const leftColX = avatarBox.x + avatarBox.w + 120;
    const rightX   = W - padX;

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    // Name label
    ctx.fillStyle = "rgba(255,255,255,.72)";
    ctx.font = "800 26px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("Your Name:", leftColX, avatarBox.y + 80);

    // Name
    ctx.fillStyle = "rgba(255,255,255,.92)";
    ctx.font = "950 64px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText(d.name || "Player", leftColX, avatarBox.y + 150);

    // divider
    ctx.strokeStyle = "rgba(255,255,255,.18)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(leftColX, avatarBox.y + 185);
    ctx.lineTo(rightX, avatarBox.y + 185);
    ctx.stroke();

    // Score label
    ctx.fillStyle = "rgba(255,255,255,.72)";
    ctx.font = "800 26px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("Score", leftColX, avatarBox.y + 275);

    // Score
    ctx.fillStyle = "rgba(255,255,255,.92)";
    ctx.font = "980 80px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText(d.scoreText || "0 / 10", leftColX, avatarBox.y + 360);

    // ===== ID AREA =====
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
    ctx.fillText(d.idText || "MB-MagicListener-XXXXX", pillX + 30, pillY + pillH/2);

    // Accuracy
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "rgba(0,0,0,.34)";
    ctx.font = "900 24px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText(`Accuracy: ${d.accuracyText || "0%"}`, avatarBox.x, H - 56);
  }

  /* =========================
     HELPERS (Song)
  ========================== */
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

  async function drawAvatarRoundedCover(ctx, dataUrl, x, y, w, h, r){
    ctx.save();
    drawRoundedRect(ctx, x, y, w, h, r);
    ctx.clip();

    ctx.fillStyle = "rgba(255,255,255,.18)";
    ctx.fillRect(x,y,w,h);

    if (dataUrl && dataUrl.startsWith("data:")){
      try{
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

  function addNoise(ctx, x, y, w, h, alpha=0.055){
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

  function drawWaves(ctx, x, y, w, h, lines=10, amp=10, alpha=0.10){
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "rgba(255,255,255,1)";
    ctx.lineWidth = 1.5;

    for (let i=0;i<lines;i++){
      const yy = y + (i/(lines-1))*h;
      ctx.beginPath();
      for (let px=0; px<=w; px+=10){
        const t = px / w;
        const wave = Math.sin((t* Math.PI*2) + i*0.55) * amp * (0.25 + 0.75*(1 - Math.abs(t-0.5)*2));
        ctx.lineTo(x + px, yy + wave);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
});

function renderTopProfile(){
  const pill = document.getElementById("profilePill");
  if (!pill) return;

  const img = pill.querySelector("img");
  const nameEl = pill.querySelector("[data-profile-name]");
  const hintEl = pill.querySelector("[data-profile-hint]");

  const p = safeJSONParse(localStorage.getItem(MB_KEYS.profile), null);
  if (!p){
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
