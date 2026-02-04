const MB_KEYS = {
  profile: "mb_profile",
  doneMovie: "mb_done_movie",
  resMovie: "mb_result_movie",
};

function safeJSONParse(v, fallback=null){ try{return JSON.parse(v)}catch{return fallback} }
function getProfile(){ return safeJSONParse(localStorage.getItem(MB_KEYS.profile), null); }

function forcePlayAll(selector){
  const vids = document.querySelectorAll(selector);
  if (!vids.length) return;
  const tryPlay = () => vids.forEach(v => v.play().catch(()=>{}));
  tryPlay();
  window.addEventListener("click", tryPlay, { once:true });
  window.addEventListener("touchstart", tryPlay, { once:true });
}

document.addEventListener("DOMContentLoaded", () => {
  forcePlayAll(".bg__video");
  forcePlayAll(".brand__logo");
  renderTopProfile();

  const QUESTIONS = [
    { frame: "../assets/movies/f1.jpg", options: ["A", "B", "C", "D"], correctIndex: 0 },
    { frame: "../assets/movies/f2.jpg", options: ["A", "B", "C", "D"], correctIndex: 1 },
    { frame: "../assets/movies/f3.jpg", options: ["A", "B", "C", "D"], correctIndex: 2 },
    { frame: "../assets/movies/f4.jpg", options: ["A", "B", "C", "D"], correctIndex: 3 },
    { frame: "../assets/movies/f5.jpg", options: ["A", "B", "C", "D"], correctIndex: 0 },
    { frame: "../assets/movies/f6.jpg", options: ["A", "B", "C", "D"], correctIndex: 1 },
    { frame: "../assets/movies/f7.jpg", options: ["A", "B", "C", "D"], correctIndex: 2 },
    { frame: "../assets/movies/f8.jpg", options: ["A", "B", "C", "D"], correctIndex: 3 },
    { frame: "../assets/movies/f9.jpg", options: ["A", "B", "C", "D"], correctIndex: 0 },
    { frame: "../assets/movies/f10.jpg", options: ["A", "B", "C", "D"], correctIndex: 1 },
  ];

  const quizPanel = document.getElementById("quizPanel");
  const resultPanel = document.getElementById("resultPanel");

  const qTitle = document.getElementById("qTitle");
  const progressText = document.getElementById("progressText");
  const frameImg = document.getElementById("frameImg");
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

  let idx = 0;
  let correct = 0;
  let selectedIndex = null;

  const saved = safeJSONParse(localStorage.getItem(MB_KEYS.resMovie), null);
  const done = localStorage.getItem(MB_KEYS.doneMovie) === "1";

  if (done && saved) showResult(saved);
  else renderQuestion();

  function renderQuestion(){
    selectedIndex = null;
    nextBtn.disabled = true;
    nextBtn.classList.remove("isShow");

    const q = QUESTIONS[idx];
    qTitle.textContent = `Question ${idx + 1} of ${QUESTIONS.length}`;
    progressText.textContent = `Progress: ${idx + 1} / ${QUESTIONS.length}`;

    frameImg.src = q.frame || "../assets/covers/placeholder.jpg";

    optionsEl.innerHTML = "";
    q.options.forEach((label, i) => {
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
    const result = { total, correct, acc, name: p?.name || "Player", ts: Date.now() };

    localStorage.setItem(MB_KEYS.doneMovie, "1");
    localStorage.setItem(MB_KEYS.resMovie, JSON.stringify(result));

    showResult(result);
  });

  function showResult(result){
    quizPanel.style.display = "none";
    resultPanel.style.display = "block";

    rName.textContent = result.name || "Player";
    rTotal.textContent = String(result.total);
    rCorrect.textContent = String(result.correct);
    rAcc.textContent = `${result.acc}%`;
  }

  genBtn.addEventListener("click", async () => {
    const p = getProfile();
    const r = safeJSONParse(localStorage.getItem(MB_KEYS.resMovie), null);
    if (!r || !cardCanvas) return;

    const id = buildId("MagicViewer");
    await drawQuizResultCard(cardCanvas, {
      title: "Guess the Movie by the Frame",
      name: p?.name || "Player",
      avatar: p?.avatar || "",
      correct: r.correct,
      total: r.total,
      acc: r.acc,
      idText: id
    });

    cardZone.classList.add("isOpen");
    cardZone.scrollIntoView({ behavior:"smooth", block:"start" });
  });

  dlBtn.addEventListener("click", () => {
    if (!cardCanvas) return;
    const a = document.createElement("a");
    a.download = "magicblock-movie-result.png";
    a.href = cardCanvas.toDataURL("image/png");
    a.click();
  });
});

/* ===== Top profile ===== */
function renderTopProfile(){
  const pill = document.getElementById("profilePill");
  if (!pill) return;

  const img = pill.querySelector("img");
  const nameEl = pill.querySelector("[data-profile-name]");
  const hintEl = pill.querySelector("[data-profile-hint]");
  const p = getProfile();

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

/* ===== ID ===== */
function buildId(prefix){
  const serial = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `MB-${prefix}-${serial}`;
}

async function drawQuizResultCard(canvas, d){
  const ctx = canvas.getContext("2d");

  canvas.width = 1600;
  canvas.height = 900;

  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);

  const card = { x: 90, y: 80, w: W-180, h: H-160, r: 95 };
  const cardBottom = card.y + card.h;

  // Base card
  drawRoundedRect(ctx, card.x, card.y, card.w, card.h, card.r);
  ctx.fillStyle = "#BFC0C2";
  ctx.fill();

  // Inner vignette (beauty, safe)
  ctx.save();
  drawRoundedRect(ctx, card.x, card.y, card.w, card.h, card.r);
  ctx.clip();

  const vg = ctx.createRadialGradient(
    card.x + card.w*0.52, card.y + card.h*0.40, 140,
    card.x + card.w*0.52, card.y + card.h*0.40, card.w*0.95
  );
  vg.addColorStop(0, "rgba(255,255,255,.20)");
  vg.addColorStop(1, "rgba(0,0,0,.12)");
  ctx.fillStyle = vg;
  ctx.fillRect(card.x, card.y, card.w, card.h);

  // Soft top gloss (safe)
  const gloss = ctx.createLinearGradient(card.x, card.y, card.x, card.y + card.h*0.55);
  gloss.addColorStop(0, "rgba(255,255,255,.18)");
  gloss.addColorStop(0.35, "rgba(255,255,255,.06)");
  gloss.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gloss;
  ctx.fillRect(card.x, card.y, card.w, card.h*0.6);

  ctx.restore();

  // Grain last
  addNoise(ctx, card.x, card.y, card.w, card.h, 0.055);

  const padX = 130;
  const padY = 120;

  // LOGO (no plate)
  const logoBox = { x: card.x + padX, y: card.y + padY - 44, w: 360, h: 110 };
  const logoBitmap = await loadWebmFrameAsBitmap("../assets/logo.webm", 0.05);
  if (logoBitmap) drawContainBitmap(ctx, logoBitmap, logoBox.x, logoBox.y, logoBox.w, logoBox.h);

  // TITLE safe area (won't collide with logo)
  const title = d.title || "Guess the Movie by the Frame";
  const titleLeft  = logoBox.x + logoBox.w + 70;
  const titleRight = card.x + card.w - padX;
  const titleMaxW  = Math.max(260, titleRight - titleLeft);
  const titleY = card.y + padY + 6;

  ctx.fillStyle = "rgba(255,255,255,.92)";
  ctx.font = fitText(ctx, title, 74, 50, titleMaxW, "950");
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(title, titleLeft, titleY);

  // AVATAR (cover, no squish)
  const avatarBox = { x: card.x + padX + 20, y: card.y + padY + 130, w: 240, h: 240, r: 70 };
  await drawAvatarRounded(ctx, d.avatar, avatarBox.x, avatarBox.y, avatarBox.w, avatarBox.h, avatarBox.r);

  // subtle rim
  ctx.save();
  drawRoundedRect(ctx, avatarBox.x, avatarBox.y, avatarBox.w, avatarBox.h, avatarBox.r);
  ctx.strokeStyle = "rgba(255,255,255,.20)";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();

  const leftColX = avatarBox.x + avatarBox.w + 110;
  const rightX   = card.x + card.w - padX;

  // Name label
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(255,255,255,.72)";
  ctx.font = "800 26px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText("Your Name:", leftColX, avatarBox.y + 72);

  // Name
  ctx.fillStyle = "rgba(255,255,255,.92)";
  ctx.font = "950 62px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(d.name || "Player", leftColX, avatarBox.y + 140);

  // Divider
  softDivider(ctx, leftColX, avatarBox.y + 176, rightX);

  // Score label
  ctx.fillStyle = "rgba(255,255,255,.72)";
  ctx.font = "800 26px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText("Score", leftColX, avatarBox.y + 260);

  // Score value (slightly higher to guarantee no collision)
  ctx.fillStyle = "rgba(255,255,255,.92)";
  ctx.font = "980 78px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(`${d.correct} / ${d.total}`, leftColX, avatarBox.y + 332);

  // Divider
  softDivider(ctx, leftColX, avatarBox.y + 388, rightX);

  // ======= ID AREA (HARD-FIXED AT BOTTOM) =======
  const pillH = 70;
  const pillY = cardBottom - 120;        // ✅ always bottom
  const pillX = leftColX;
  const pillW = Math.min(900, rightX - pillX);

  // ID label (always above pill)
  ctx.fillStyle = "rgba(255,255,255,.70)";
  ctx.font = "800 22px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("ID Name:", leftColX, pillY - 18);

  // Pill base
  ctx.save();
  drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 34);
  ctx.fillStyle = "rgba(0,0,0,.26)";
  ctx.fill();
  // micro gloss
  const pg = ctx.createLinearGradient(pillX, pillY, pillX, pillY + pillH);
  pg.addColorStop(0, "rgba(255,255,255,.12)");
  pg.addColorStop(0.45, "rgba(255,255,255,.05)");
  pg.addColorStop(1, "rgba(255,255,255,0)");
  ctx.clip();
  ctx.fillStyle = pg;
  ctx.fillRect(pillX, pillY, pillW, pillH);
  ctx.restore();

  // Pill text
  ctx.fillStyle = "rgba(255,255,255,.92)";
  ctx.font = "900 30px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.textBaseline = "middle";
  ctx.fillText(d.idText || "MB-MagicViewer-XXXXX", pillX + 28, pillY + pillH/2);

  // Accuracy
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(0,0,0,.34)";
  ctx.font = "900 24px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(`Accuracy: ${d.acc}%`, avatarBox.x, cardBottom - 56);
}

/* safe divider (nice, doesn't move layout) */
function softDivider(ctx, x1, y, x2){
  ctx.save();
  ctx.lineWidth = 2;
  const g = ctx.createLinearGradient(x1, y, x2, y);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.12, "rgba(255,255,255,.18)");
  g.addColorStop(0.88, "rgba(255,255,255,.14)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.strokeStyle = g;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}

/* ===== Pretty helpers (safe) ===== */
function softDivider(ctx, x1, y, x2){
  ctx.save();
  ctx.lineWidth = 2;
  const g = ctx.createLinearGradient(x1, y, x2, y);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.12, "rgba(255,255,255,.20)");
  g.addColorStop(0.88, "rgba(255,255,255,.16)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.strokeStyle = g;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}

function drawWaves(ctx, x1, y1, x2, y2, lines=10){
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,.22)";
  const w = x2 - x1;
  const h = y2 - y1;

  for (let i=0; i<lines; i++){
    const t = i/(lines-1);
    const y = y1 + t*h;

    ctx.beginPath();
    const amp = 10 + (i%2)*4;
    const freq = 2.2;
    for (let x=0; x<=w; x+=18){
      const yy = y + Math.sin((x/w)*Math.PI*freq + t*2.3) * amp;
      if (x===0) ctx.moveTo(x1 + x, yy);
      else ctx.lineTo(x1 + x, yy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/* =========================
   HELPERS
========================= */
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
