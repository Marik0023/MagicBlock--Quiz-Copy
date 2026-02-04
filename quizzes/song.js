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
    // гарантуємо ID навіть для старих результатів
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
     RESULT CARD (PNG no background)
  ========================== */

  async function drawQuizResultCard(canvas, d){
    // фіксований розмір (як чемпіон по формату wide)
    canvas.width = 1600;
    canvas.height = 900;

    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H); // прозорий фон PNG

    const card = { x: 18, y: 18, w: W-36, h: H-36, r: 92 };

    // card background (silver)
    roundRectPath(ctx, card.x, card.y, card.w, card.h, card.r);
    const g = ctx.createLinearGradient(card.x, card.y, card.x + card.w, card.y + card.h);
    g.addColorStop(0, "#BFC0C3");
    g.addColorStop(.55, "#A7A8AB");
    g.addColorStop(1, "#8F9093");
    ctx.fillStyle = g;
    ctx.fill();

    // subtle vignette + highlights (inside clip)
    ctx.save();
    ctx.clip();
    // top highlight
    const hg = ctx.createRadialGradient(card.x + card.w*0.45, card.y + card.h*0.15, 10, card.x + card.w*0.45, card.y + card.h*0.15, card.w*0.7);
    hg.addColorStop(0, "rgba(255,255,255,.40)");
    hg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = hg;
    ctx.fillRect(card.x, card.y, card.w, card.h);

    // center soft light
    const cg = ctx.createRadialGradient(card.x + card.w*0.45, card.y + card.h*0.55, 20, card.x + card.w*0.45, card.y + card.h*0.55, card.w*0.55);
    cg.addColorStop(0, "rgba(255,255,255,.18)");
    cg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = cg;
    ctx.fillRect(card.x, card.y, card.w, card.h);

    // waves decor (right + bottom-left)
    drawWaves(ctx, card.x + card.w - 520, card.y + 210, 430, 250, 10, 9, 0.10);
    drawWaves(ctx, card.x + 120, card.y + card.h - 250, 520, 170, 8, 10, 0.07);

    // grain
    drawGrain(ctx, card.x, card.y, card.w, card.h, 0.07);
    ctx.restore();

    // strokes (clean)
    roundRectPath(ctx, card.x, card.y, card.w, card.h, card.r);
    ctx.strokeStyle = "rgba(255,255,255,.45)";
    ctx.lineWidth = 3;
    ctx.stroke();

    roundRectPath(ctx, card.x+8, card.y+8, card.w-16, card.h-16, card.r-8);
    ctx.strokeStyle = "rgba(0,0,0,.15)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // layout
    const pad = 92;
    const left = card.x + pad;
    const top = card.y + pad;

// ---- logo (NO squash) ----
const logoBox = { w: 260, h: 74 };
const logoX = left;
const logoY = card.y + 54;

const logoVideo = await loadVideoFrame(d.logoSrc);
if (logoVideo){
  ctx.save();
  ctx.globalAlpha = 0.92;
  drawContain(ctx, logoVideo, logoX, logoY, logoBox.w, logoBox.h); // <— пропорції збережені
  ctx.restore();
} else {
  ctx.fillStyle = "rgba(255,255,255,.92)";
  ctx.font = "800 34px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText("MagicBlock", logoX, logoY + 46);
  ctx.fillStyle = "rgba(255,255,255,.78)";
  ctx.font = "800 20px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText("Quiz", logoX + 200, logoY + 46);
}

// ---- title (NEVER overlaps logo) ----
// малюємо заголовок тільки в зоні СПРАВА від лого
const titleAreaLeft = logoX + logoBox.w + 44;
const titleAreaRight = card.x + card.w - pad;
const titleCx = (titleAreaLeft + titleAreaRight) / 2;
const titleMaxW = (titleAreaRight - titleAreaLeft);

// трохи нижче щоб виглядало як у чемпіона
const titleY = card.y + 138;

drawCenteredFitText(ctx, d.quizTitle, titleCx, titleY, titleMaxW, 66, 42, "800");

    // avatar
    const avSize = 250;
    const avX = left + 40;
    const avY = top + 160;
    await drawAvatarRounded(ctx, d.avatar, avX, avY, avSize, 64);

    // text column
    const tx = avX + avSize + 100;
    let y = avY + 42;

    // Your Name
    ctx.fillStyle = "rgba(255,255,255,.80)";
    ctx.font = "800 30px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("Your Name:", tx, y);

    y += 74;
    ctx.fillStyle = "rgba(255,255,255,.96)";
    drawLeftFitText(ctx, d.name, tx, y, card.x + card.w - pad - tx, 72, 52, "900");

    // separator line
    y += 34;
    ctx.strokeStyle = "rgba(255,255,255,.18)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tx, y);
    ctx.lineTo(card.x + card.w - pad, y);
    ctx.stroke();

    // Score
    y += 68;
    ctx.fillStyle = "rgba(255,255,255,.78)";
    ctx.font = "800 30px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("Score", tx, y);

    y += 76;
    ctx.fillStyle = "rgba(255,255,255,.96)";
    ctx.font = "900 86px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText(d.scoreText, tx, y);

    // bottom line
    const lineY = card.y + card.h - 190;
    ctx.strokeStyle = "rgba(255,255,255,.16)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tx, lineY);
    ctx.lineTo(card.x + card.w - pad, lineY);
    ctx.stroke();

    // ID label
    ctx.fillStyle = "rgba(255,255,255,.78)";
    ctx.font = "800 28px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("ID Name:", tx, lineY + 78);

    // ID pill
    const pillX = tx;
    const pillY = lineY + 98;
    const pillW = (card.x + card.w - pad) - tx;
    const pillH = 72;

    ctx.fillStyle = "rgba(0,0,0,.22)";
    roundRect(ctx, pillX, pillY, pillW, pillH, 36, true, false);

    ctx.strokeStyle = "rgba(255,255,255,.18)";
    ctx.lineWidth = 2;
    roundRect(ctx, pillX, pillY, pillW, pillH, 36, false, true);

    ctx.fillStyle = "rgba(255,255,255,.92)";
    drawLeftFitText(ctx, d.idText, pillX + 28, pillY + 50, pillW - 56, 34, 24, "900");

    // Accuracy bottom-left
    ctx.fillStyle = "rgba(0,0,0,.30)";
    ctx.font = "800 26px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText(`Accuracy: ${d.accuracyText}`, card.x + 84, card.y + card.h - 74);
  }

  function roundRectPath(ctx, x, y, w, h, r){
    const rr = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x+rr, y);
    ctx.arcTo(x+w, y, x+w, y+h, rr);
    ctx.arcTo(x+w, y+h, x, y+h, rr);
    ctx.arcTo(x, y+h, x, y, rr);
    ctx.arcTo(x, y, x+w, y, rr);
    ctx.closePath();
  }

  function roundRect(ctx, x, y, w, h, r, fill, stroke){
    roundRectPath(ctx, x, y, w, h, r);
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  function drawCenteredFitText(ctx, text, cx, y, maxWidth, startSize, minSize, weight="800"){
    let size = startSize;
    while (size > minSize){
      ctx.font = `${weight} ${size}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
      if (ctx.measureText(text).width <= maxWidth) break;
      size -= 2;
    }
    let out = text;
    while (ctx.measureText(out).width > maxWidth && out.length > 4){
      out = out.slice(0, -2) + "…";
    }
    ctx.fillStyle = "rgba(255,255,255,.96)";
    ctx.textAlign = "center";
    ctx.fillText(out, cx, y);
    ctx.textAlign = "left";
  }

  function drawLeftFitText(ctx, text, x, y, maxWidth, startSize, minSize, weight="900"){
    let size = startSize;
    while (size > minSize){
      ctx.font = `${weight} ${size}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
      if (ctx.measureText(text).width <= maxWidth) break;
      size -= 2;
    }
    let out = text;
    while (ctx.measureText(out).width > maxWidth && out.length > 4){
      out = out.slice(0, -2) + "…";
    }
    ctx.fillText(out, x, y);
  }

  async function drawAvatarRounded(ctx, dataUrl, x, y, size, r){
    // frame
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.18)";
    roundRect(ctx, x, y, size, size, r, true, false);

    ctx.strokeStyle = "rgba(255,255,255,.20)";
    ctx.lineWidth = 3;
    roundRect(ctx, x, y, size, size, r, false, true);

    // clip & draw
    roundRectPath(ctx, x+6, y+6, size-12, size-12, r-8);
    ctx.clip();

    if (dataUrl && dataUrl.startsWith("data:")){
      try{
        const img = await loadImage(dataUrl);
        ctx.drawImage(img, x, y, size, size);
      } catch {}
    }
    ctx.restore();
  }

  function loadImage(src){
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function loadVideoFrame(src){
    return new Promise((resolve) => {
      const v = document.createElement("video");
      v.muted = true;
      v.playsInline = true;
      v.preload = "auto";
      v.src = src;

      const done = () => {
        try { resolve(v); } catch { resolve(null); }
      };

      v.addEventListener("loadeddata", () => {
        // перший кадр уже доступний
        done();
      }, { once:true });

      v.addEventListener("error", () => resolve(null), { once:true });
      // safari sometimes needs a tick
      setTimeout(() => {
        if (v.readyState >= 2) done();
      }, 250);
    });
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

  function drawGrain(ctx, x, y, w, h, alpha=0.07){
    const g = 220;
    const off = document.createElement("canvas");
    off.width = g; off.height = g;
    const octx = off.getContext("2d");
    const img = octx.createImageData(g, g);
    for (let i=0;i<img.data.length;i+=4){
      const v = (Math.random()*255)|0;
      img.data[i] = v;
      img.data[i+1] = v;
      img.data[i+2] = v;
      img.data[i+3] = (Math.random()*255)|0;
    }
    octx.putImageData(img, 0, 0);

    ctx.save();
    ctx.globalAlpha = alpha;
    const pat = ctx.createPattern(off, "repeat");
    ctx.fillStyle = pat;
    ctx.fillRect(x, y, w, h);
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
