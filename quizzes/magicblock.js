const MB_KEYS = {
  profile: "mb_profile",
  doneMagic: "mb_done_magicblock",
  resMagic: "mb_result_magicblock",
  prevMagic: "mb_prev_magicblock",
  progMagic: "mb_prog_magicblock",
};

const QUIZ_CARD = {
  title: "How well do you know MagicBlock?",
  idPrefix: "MagicStudent",
};

function safeJSONParse(v, fallback=null){ try{return JSON.parse(v)}catch{return fallback} }
function getProfile(){ return safeJSONParse(localStorage.getItem(MB_KEYS.profile), null); }

// Storage can get full because previews are big (data URLs). If that happens,
// clear ONLY preview items and retry saves.
function clearBigPreviews(){
  const keys = [
    "mb_prev_song",
    "mb_prev_movie",
    "mb_prev_magicblock",
    "mb_png_champion"
  ];
  keys.forEach((k) => {
    try{ localStorage.removeItem(k); }catch{}
  });
}

function safeLSSet(key, value){
  try{ localStorage.setItem(key, value); return true; }catch{ return false; }
}

function forcePlayAll(selector){
  const vids = document.querySelectorAll(selector);
  if (!vids.length) return;
  const tryPlay = () => vids.forEach(v => v.play().catch(()=>{}));
  tryPlay();
  window.addEventListener("click", tryPlay, { once:true });
  window.addEventListener("touchstart", tryPlay, { once:true });
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
    { text: "MagicBlock is…", options: ["A", "B", "C", "D"], correctIndex: 0 },
    { text: "MagicBlock helps with…", options: ["A", "B", "C", "D"], correctIndex: 1 },
    { text: "MagicBlock is built for…", options: ["A", "B", "C", "D"], correctIndex: 2 },
    { text: "MagicBlock main focus is…", options: ["A", "B", "C", "D"], correctIndex: 3 },
    { text: "Question 5", options: ["A", "B", "C", "D"], correctIndex: 0 },
    { text: "Question 6", options: ["A", "B", "C", "D"], correctIndex: 1 },
    { text: "Question 7", options: ["A", "B", "C", "D"], correctIndex: 2 },
    { text: "Question 8", options: ["A", "B", "C", "D"], correctIndex: 3 },
    { text: "Question 9", options: ["A", "B", "C", "D"], correctIndex: 0 },
    { text: "Question 10", options: ["A", "B", "C", "D"], correctIndex: 1 },
  ];

  const quizPanel = document.getElementById("quizPanel");
  const resultPanel = document.getElementById("resultPanel");

  const qTitle = document.getElementById("qTitle");
  const progressText = document.getElementById("progressText");
  const progressFill = document.getElementById("progressFill");
  const questionText = document.getElementById("questionText");
  const optionsEl = document.getElementById("options");
  const nextBtn = document.getElementById("nextBtn");

  const rName = document.getElementById("rName");
  const rTotal = document.getElementById("rTotal");
  const rCorrect = document.getElementById("rCorrect");
  const rAcc = document.getElementById("rAcc");

  const genBtn = document.getElementById("genBtn");
  const progressNotice = document.getElementById("progressNotice");
  const progressTextNote = document.getElementById("progressTextNote");
    const cardZone = document.getElementById("cardZone");
  const cardCanvas = document.getElementById("cardCanvas");
  const dlBtn = document.getElementById("dlBtn");

  let idx = 0;
  let correct = 0;
  let selectedIndex = null;
  let answers = [];

  const saved = safeJSONParse(localStorage.getItem(MB_KEYS.resMagic), null);
  const done = localStorage.getItem(MB_KEYS.doneMagic) === "1";
  const prog = safeJSONParse(localStorage.getItem(MB_KEYS.progMagic), null);

  if (restartProgressBtn){
        });
  }

  if (done){
    if (saved){
      if (!saved.id){
        saved.id = ensureResultId(QUIZ_CARD.idPrefix, saved.id);
        safeLSSet(MB_KEYS.resMagic, JSON.stringify(saved));
      }
      showResult(saved);
      return;
    }

    // Marked completed but result missing (often quota/full localStorage).
    // Try to reconstruct from progress so the quiz stays "once".
    const p = getProfile();
    const total = QUESTIONS.length;
    const fromProg = (prog && Array.isArray(prog.answers) && prog.answers.length) ? prog.answers : [];
    const correctFromProg = fromProg.reduce((acc, a) => acc + (a && a.isCorrect ? 1 : 0), 0);
    const reconstructed = {
      total,
      correct: correctFromProg,
      acc: total ? Math.round((correctFromProg / total) * 100) : 0,
      name: p?.name || "Player",
      id: ensureResultId(QUIZ_CARD.idPrefix, null),
      answers: fromProg.slice(0, total),
      ts: Date.now(),
      missing: true,
    };
    const rStr = JSON.stringify(reconstructed);
    if (!safeLSSet(MB_KEYS.resMagic, rStr)){
      clearBigPreviews();
      safeLSSet(MB_KEYS.resMagic, rStr);
    }
    showResult(reconstructed);
    return;
  }

  {
    if (prog && typeof prog.idx === "number" && prog.idx > 0 && prog.idx < QUESTIONS.length){
      idx = Math.floor(prog.idx);
      correct = Math.max(0, Math.floor(prog.correct || 0));
      answers = Array.isArray(prog.answers) ? prog.answers : [];
      if (progressNotice){
        progressNotice.style.display = "flex";
        if (progressTextNote) progressTextNote.textContent = `Progress restored — continue from Q${idx + 1} / ${QUESTIONS.length}`;
      }
    }
    renderQuestion();
  }

  function renderQuestion(){
    selectedIndex = null;
    nextBtn.disabled = true;
    nextBtn.classList.remove("isShow");

    const q = QUESTIONS[idx];
    qTitle.textContent = `Question ${idx + 1} of ${QUESTIONS.length}`;
    progressText.textContent = `Progress: ${idx + 1} / ${QUESTIONS.length}`;
    questionText.textContent = q.text;

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

  function saveProgress(){
    const payload = JSON.stringify({ idx, correct, answers, ts: Date.now() });
    if (!safeLSSet(MB_KEYS.progMagic, payload)){
      clearBigPreviews();
      safeLSSet(MB_KEYS.progMagic, payload);
    }
  }

  nextBtn.addEventListener("click", () => {
    if (selectedIndex === null) return;

    const q = QUESTIONS[idx];
    answers[idx] = {
      q: q.text || `Question ${idx + 1}`,
      options: q.options,
      selected: selectedIndex,
      correct: q.correctIndex
    };
    if (selectedIndex === q.correctIndex) correct++;

    idx++;
    saveProgress();
    if (idx < QUESTIONS.length){
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
      // ✅ for Result review
      answers: answers.slice(0, total)
    };

    const resultStr = JSON.stringify(result);
    if (!safeLSSet(MB_KEYS.doneMagic, "1") || !safeLSSet(MB_KEYS.resMagic, resultStr)){
      clearBigPreviews();
      safeLSSet(MB_KEYS.doneMagic, "1");
      safeLSSet(MB_KEYS.resMagic, resultStr);
    }
    try{ localStorage.removeItem(MB_KEYS.progMagic); }catch{}
    showResult(result);
  });

  function showResult(result){
    quizPanel.style.display = "none";
    resultPanel.style.display = "block";

    rName.textContent = result.name || "Player";
    rTotal.textContent = String(result.total);
    rCorrect.textContent = String(result.correct);
    rAcc.textContent = `${result.acc}%`;

    renderReview(result);
  }

  function renderReview(result){
    const wrap = document.getElementById("reviewWrap");
    const list = document.getElementById("reviewList");
    if (!wrap || !list) return;

    const ans = Array.isArray(result?.answers) ? result.answers.filter(Boolean) : [];
    if (!ans.length){
      wrap.style.display = "none";
      return;
    }

    wrap.style.display = "block";
    list.innerHTML = `
      <div class="reviewGrid">
        <div class="reviewHead">Q</div>
        <div class="reviewHead"></div>
        <div class="reviewHead">Your answer</div>
        <div class="reviewHead hideOnMobile reviewHead">Correct</div>
      </div>
    `;
    const grid = list.querySelector(".reviewGrid");

    ans.forEach((a, i) => {
      const ok = a.selected === a.correct;
      const selText = (a.options && a.options[a.selected]) ? a.options[a.selected] : "—";
      const corText = (a.options && a.options[a.correct]) ? a.options[a.correct] : "—";

      const q = document.createElement("div");
      q.className = "reviewQ reviewRow";
      q.textContent = `Q${i + 1}`;

      const icon = document.createElement("div");
      icon.className = "reviewIcon reviewRow";
      icon.textContent = ok ? "✅" : "❌";

      const your = document.createElement("div");
      your.className = "reviewYour reviewRow";
      your.innerHTML = `<div>${selText}</div>${ok ? "" : `<div class="reviewMuted">Correct: ${corText}</div>`}`;

      const correct = document.createElement("div");
      correct.className = "reviewCorrect reviewRow reviewCorrectCol";
      correct.textContent = corText;

      grid.appendChild(q);
      grid.appendChild(icon);
      grid.appendChild(your);
      grid.appendChild(correct);
    });
  });

/* =========================
   CANVAS DRAW (MagicBlock)
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
  const logoBitmap = await loadWebmFrameAsBitmap(d.logoSrc || "../assets/logo.webm", 0.05);
  if (logoBitmap) drawContainBitmap(ctx, logoBitmap, logoBox.x, logoBox.y, logoBox.w, logoBox.h);

  const title = d.title || "How well do you know MagicBlock?";
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
  ctx.fillText(d.idText || "MB-MagicStudent-XXXXX", pillX + 30, pillY + pillH/2);

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(0,0,0,.34)";
  ctx.font = "900 24px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(`Accuracy: ${d.acc}%`, avatarBox.x, H - 56);
}

/* =========================
   ✅ RESTORE PREVIEW (NO UPSCALE)
========================= */
async function restoreQuizPreview(previewKey, cardCanvas, cardZone, dlBtn, genBtn){
  const prev = localStorage.getItem(previewKey);
  if (!prev || !prev.startsWith("data:image/") || !cardCanvas) return false;

  try{
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = prev;
    });

    cardCanvas.width = img.naturalWidth || img.width;
    cardCanvas.height = img.naturalHeight || img.height;

    const ctx = cardCanvas.getContext("2d");
    ctx.clearRect(0,0,cardCanvas.width,cardCanvas.height);
    ctx.drawImage(img, 0, 0);

    cardZone?.classList.add("isOpen");
    if (dlBtn) dlBtn.disabled = false;
    if (genBtn) genBtn.textContent = "Regenerate Result Card";
    return true;
  }catch(e){
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
