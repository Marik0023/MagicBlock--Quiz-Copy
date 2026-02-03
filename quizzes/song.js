const MB_KEYS = {
  profile: "mb_profile",
  doneSong: "mb_done_song",
  resSong: "mb_result_song",
  idSong: "mb_card_id_song", // ✅ стабільний ID для Song-карти
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

function randCode(len=6){
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // без схожих 0/O/1/I
  let out = "";
  for (let i=0;i<len;i++) out += abc[Math.floor(Math.random()*abc.length)];
  return out;
}
function getOrCreateCardId(storageKey, prefix){
  try{
    const have = localStorage.getItem(storageKey);
    if (have) return have;
    const id = `MB-${prefix}-${randCode(6)}`;
    localStorage.setItem(storageKey, id);
    return id;
  } catch {
    return `MB-${prefix}-${randCode(6)}`;
  }
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

  // ===== Audio UI =====
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

  // ===== Load saved =====
  const saved = safeJSONParse(localStorage.getItem(MB_KEYS.resSong), null);
  const done = localStorage.getItem(MB_KEYS.doneSong) === "1";

  if (done && saved){
    showResult(saved);
  } else {
    renderQuestion();
  }

  // ===== Quiz render =====
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

    const result = { total, correct, acc, name: p?.name || "Player", ts: Date.now() };

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

  // ===== Card (NEW DESIGN) =====
  genBtn?.addEventListener("click", async () => {
    if (!cardCanvas) return;

    const p = getProfile();
    const r = safeJSONParse(localStorage.getItem(MB_KEYS.resSong), null);
    if (!r) return;

    const quizTitle = document.querySelector(".quizHero h1")?.textContent?.trim() || "Song Quiz";
    const idName = getOrCreateCardId(MB_KEYS.idSong, "MagicListener");

    await drawQuizWideCard(cardCanvas, {
      quizTitle,
      name: p?.name || "Player",
      avatar: p?.avatar || "",
      scoreText: `${r.correct} / ${r.total}`,
      accText: `${r.acc}%`,
      idName
    });

    cardZone?.classList.add("isOpen");
    cardZone?.scrollIntoView({ behavior:"smooth", block:"start" });
  });

  dlBtn?.addEventListener("click", () => {
    if (!cardCanvas) return;
    const a = document.createElement("a");
    a.download = "magicblock-song-card.png";
    a.href = cardCanvas.toDataURL("image/png");
    a.click();
  });

  // ============================
  // Canvas drawing helpers
  // ============================
  function rrPath(ctx, x, y, w, h, r){
    const rr = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x+rr, y);
    ctx.arcTo(x+w, y, x+w, y+h, rr);
    ctx.arcTo(x+w, y+h, x, y+h, rr);
    ctx.arcTo(x, y+h, x, y, rr);
    ctx.arcTo(x, y, x+w, y, rr);
    ctx.closePath();
  }

  function fillRR(ctx, x, y, w, h, r){
    rrPath(ctx, x, y, w, h, r);
    ctx.fill();
  }

  function strokeRR(ctx, x, y, w, h, r){
    rrPath(ctx, x, y, w, h, r);
    ctx.stroke();
  }

  function loadImage(src){
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function loadVideoFrame(src, time=0.05){
    return new Promise((resolve, reject) => {
      const v = document.createElement("video");
      v.muted = true;
      v.playsInline = true;
      v.preload = "auto";
      v.src = src;

      const cleanup = () => {
        v.onloadedmetadata = null;
        v.onseeked = null;
        v.onerror = null;
      };

      v.onerror = (e) => { cleanup(); reject(e); };

      v.onloadedmetadata = () => {
        try{
          v.currentTime = Math.min(Math.max(time, 0), Math.max((v.duration || 1) - 0.05, 0.05));
        }catch{
          // якщо currentTime не дається — просто пробуємо loadeddata
          resolve(v);
        }
      };

      v.onseeked = () => {
        cleanup();
        resolve(v);
      };
    });
  }

  async function loadLogoAsset(){
    // ✅ не “створюємо” логотип — пробуємо взяти з assets
    const candidates = [
      "../assets/logo.png",
      "../assets/logo.webp",
      "../assets/logo.svg",
      "../assets/logo.jpg",
      "../assets/logo.jpeg",
    ];

    for (const src of candidates){
      try{
        const img = await loadImage(src);
        return { kind: "img", node: img };
      }catch{}
    }

    // fallback: якщо у тебе тільки logo.webm — беремо 1 кадр
    try{
      const vid = await loadVideoFrame("../assets/logo.webm", 0.05);
      return { kind: "video", node: vid };
    }catch{}

    return null;
  }

  function makeNoisePattern(scale=240){
    const c = document.createElement("canvas");
    c.width = scale; c.height = scale;
    const n = c.getContext("2d");

    const img = n.createImageData(scale, scale);
    for (let i=0; i<img.data.length; i+=4){
      const v = (Math.random()*255)|0;
      img.data[i] = v;
      img.data[i+1] = v;
      img.data[i+2] = v;
      img.data[i+3] = 18; // alpha
    }
    n.putImageData(img, 0, 0);
    return c;
  }

  function drawWaves(ctx, x, y, w, h, amp=10, lines=14, alpha=0.11){
    ctx.save();
    rrPath(ctx, x, y, w, h, 60);
    ctx.clip();

    ctx.lineWidth = 2;
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;

    const stepY = h / (lines + 2);
    for (let i=0; i<lines; i++){
      const yy = y + stepY*(i+1);
      ctx.beginPath();

      const freq = 90 + i*2.2;
      const phase = i * 0.7;
      for (let xx = 0; xx <= w; xx += 10){
        const t = (xx / freq) + phase;
        const dy = Math.sin(t) * (amp * (0.55 + i/lines*0.55));
        ctx.lineTo(x + xx, yy + dy);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  async function drawAvatarRounded(ctx, dataUrl, x, y, size, r){
    ctx.save();
    rrPath(ctx, x, y, size, size, r);
    ctx.clip();

    // base
    const g = ctx.createLinearGradient(x, y, x+size, y+size);
    g.addColorStop(0, "rgba(255,255,255,0.12)");
    g.addColorStop(1, "rgba(0,0,0,0.14)");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, size, size);

    if (dataUrl && dataUrl.startsWith("data:")){
      try{
        const img = await loadImage(dataUrl);
        // cover-crop
        const iw = img.naturalWidth || img.width;
        const ih = img.naturalHeight || img.height;
        const s = Math.max(size/iw, size/ih);
        const dw = iw*s;
        const dh = ih*s;
        const dx = x + (size - dw)/2;
        const dy = y + (size - dh)/2;
        ctx.drawImage(img, dx, dy, dw, dh);
      }catch{}
    }

    // subtle overlay
    const rg = ctx.createRadialGradient(x+size*0.25, y+size*0.2, 0, x+size*0.25, y+size*0.2, size*0.95);
    rg.addColorStop(0, "rgba(255,255,255,0.20)");
    rg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = rg;
    ctx.fillRect(x, y, size, size);

    ctx.restore();

    // border
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    strokeRR(ctx, x, y, size, size, r);

    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(0,0,0,0.30)";
    strokeRR(ctx, x+7, y+7, size-14, size-14, Math.max(10, r-8));
  }

  // ============================
  // NEW: wide quiz card (like champion size)
  // ============================
  async function drawQuizWideCard(canvas, d){
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;

    ctx.clearRect(0,0,W,H);

    // page bg (transparent look not needed, but keep nice)
    const pageG = ctx.createLinearGradient(0, 0, W, H);
    pageG.addColorStop(0, "#07080d");
    pageG.addColorStop(1, "#05060a");
    ctx.fillStyle = pageG;
    ctx.fillRect(0,0,W,H);

    // card geometry
    const pad = 110;
    const x = pad, y = pad, w = W - pad*2, h = H - pad*2;
    const r = 84;

    // shadow
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 60;
    ctx.shadowOffsetY = 22;
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    fillRR(ctx, x, y, w, h, r);
    ctx.restore();

    // main metallic panel
    const g = ctx.createLinearGradient(x, y, x+w, y+h);
    g.addColorStop(0, "rgba(255,255,255,0.16)");
    g.addColorStop(0.20, "rgba(255,255,255,0.10)");
    g.addColorStop(0.55, "rgba(255,255,255,0.08)");
    g.addColorStop(1, "rgba(255,255,255,0.12)");
    ctx.fillStyle = g;
    fillRR(ctx, x, y, w, h, r);

    // inner dark glaze
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    fillRR(ctx, x+16, y+16, w-32, h-32, r-16);

    // noise
    const noise = makeNoisePattern(260);
    ctx.save();
    rrPath(ctx, x+16, y+16, w-32, h-32, r-16);
    ctx.clip();
    ctx.globalAlpha = 0.16;
    ctx.drawImage(noise, x+16, y+16, w-32, h-32);
    ctx.globalAlpha = 1;
    ctx.restore();

    // center glow
    ctx.save();
    rrPath(ctx, x+16, y+16, w-32, h-32, r-16);
    ctx.clip();
    const rg = ctx.createRadialGradient(x+w*0.46, y+h*0.44, 0, x+w*0.46, y+h*0.44, h*0.75);
    rg.addColorStop(0, "rgba(255,255,255,0.14)");
    rg.addColorStop(0.55, "rgba(255,255,255,0.05)");
    rg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = rg;
    ctx.fillRect(x, y, w, h);
    ctx.restore();

    // waves (right top + left bottom, like твоє реф)
    drawWaves(ctx, x+w*0.63, y+h*0.18, w*0.34, h*0.44, 9, 16, 0.11);
    drawWaves(ctx, x+w*0.06, y+h*0.56, w*0.40, h*0.36, 10, 14, 0.09);

    // strokes
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    strokeRR(ctx, x, y, w, h, r);

    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    strokeRR(ctx, x+22, y+22, w-44, h-44, r-22);

    // logo (top-left)
    const logo = await loadLogoAsset();
    const lx = x + 60;
    const ly = y + 44;
    const lh = 54;

    if (logo?.kind === "img"){
      const img = logo.node;
      const ratio = (img.naturalWidth || img.width) / (img.naturalHeight || img.height || 1);
      const lw = lh * ratio;
      ctx.globalAlpha = 0.92;
      ctx.drawImage(img, lx, ly, lw, lh);
      ctx.globalAlpha = 1;
    } else if (logo?.kind === "video"){
      const v = logo.node;
      const vw = v.videoWidth || 320;
      const vh = v.videoHeight || 120;
      const ratio = vw / (vh || 1);
      const lw = lh * ratio;
      ctx.globalAlpha = 0.92;
      ctx.drawImage(v, lx, ly, lw, lh);
      ctx.globalAlpha = 1;
    } else {
      // fallback (якщо раптом нема файлу)
      ctx.fillStyle = "rgba(255,255,255,0.88)";
      ctx.font = "800 34px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      ctx.fillText("MagicBlock", lx, ly+40);
    }

    // Title centered
    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "900 56px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.shadowColor = "rgba(0,0,0,0.30)";
    ctx.shadowBlur = 10;
    ctx.fillText(d.quizTitle || "Quiz", x + w/2, y + 92);
    ctx.restore();

    // avatar block
    const avSize = 270;
    const avX = x + 110;
    const avY = y + 210;
    await drawAvatarRounded(ctx, d.avatar, avX, avY, avSize, 64);

    // text layout
    const tx = x + 520;
    const startY = y + 290;

    // separators
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tx, y + 410);
    ctx.lineTo(x + w - 140, y + 410);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(tx, y + 590);
    ctx.lineTo(x + w - 140, y + 590);
    ctx.stroke();

    // labels
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.font = "800 34px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("Your Name:", tx, startY);

    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "950 64px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText(d.name || "Player", tx, startY + 78);

    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.font = "800 34px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("Score", tx, startY + 190);

    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "950 70px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText(d.scoreText || "0 / 10", tx, startY + 270);

    // ID label
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.font = "800 34px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("ID Name:", tx, startY + 390);

    // ID pill
    const pillW = 760;
    const pillH = 74;
    const pillX = tx;
    const pillY = startY + 430;

    ctx.fillStyle = "rgba(0,0,0,0.30)";
    fillRR(ctx, pillX, pillY, pillW, pillH, 28);

    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 2;
    strokeRR(ctx, pillX, pillY, pillW, pillH, 28);

    ctx.fillStyle = "rgba(255,255,255,0.90)";
    ctx.font = "900 34px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText(d.idName || "MB-MagicListener-XXXXXX", pillX + 26, pillY + 50);

    // small accuracy bottom-left (не заважає, виглядає як “чемпіон”)
    ctx.fillStyle = "rgba(255,255,255,0.40)";
    ctx.font = "800 28px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText(`Accuracy: ${d.accText || "0%"}`, x + 92, y + h - 72);
  }
});
