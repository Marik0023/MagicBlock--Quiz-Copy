const MB_KEYS = {
  profile: "mb_profile",
  doneSong: "mb_done_song",
  doneMovie: "mb_done_movie",
  doneMagic: "mb_done_magicblock",
  resSong: "mb_result_song",
  resMovie: "mb_result_movie",
  resMagic: "mb_result_magicblock",
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
forcePlayAll(".bg__video");
forcePlayAll(".brand__logo");

function renderTopProfile(){
  const pill = document.getElementById("profilePill");
  if (!pill) return;

  const img = pill.querySelector("img");
  const nameEl = pill.querySelector("[data-profile-name]");
  const hintEl = pill.querySelector("[data-profile-hint]");

  const p = getProfile();

  if (!p){
    if (img) img.src = "assets/uploadavatar.jpg";
    if (nameEl) nameEl.textContent = "No profile";
    if (hintEl) hintEl.textContent = "Go Home";
    pill.addEventListener("click", () => location.href = "index.html");
    return;
  }

  if (img) img.src = p.avatar || "assets/uploadavatar.jpg";
  if (nameEl) nameEl.textContent = p.name || "Player";
  if (hintEl) hintEl.textContent = "Edit on Home";
  pill.addEventListener("click", () => location.href = "index.html");
}
renderTopProfile();

const sumName = document.getElementById("sumName");
const sumDone = document.getElementById("sumDone");
const sumTotal = document.getElementById("sumTotal");
const sumCorrect = document.getElementById("sumCorrect");
const sumAcc = document.getElementById("sumAcc");

const genBtn = document.getElementById("genChampBtn");
const cardZone = document.getElementById("cardZone");
const cardCanvas = document.getElementById("cardCanvas");
const dlBtn = document.getElementById("dlBtn");

function isDone(k){ return localStorage.getItem(k) === "1"; }
function loadResult(key){ return safeJSONParse(localStorage.getItem(key), null); }

function computeSummary(){
  const p = getProfile();
  if (sumName) sumName.textContent = p?.name || "Player";

  const doneFlags = [
    isDone(MB_KEYS.doneSong),
    isDone(MB_KEYS.doneMovie),
    isDone(MB_KEYS.doneMagic),
  ];
  const doneCount = doneFlags.filter(Boolean).length;
  if (sumDone) sumDone.textContent = `${doneCount} / 3`;

  const r1 = loadResult(MB_KEYS.resSong);
  const r2 = loadResult(MB_KEYS.resMovie);
  const r3 = loadResult(MB_KEYS.resMagic);

  const results = [r1, r2, r3].filter(Boolean);
  const total = results.reduce((a,r)=>a + (r.total||0), 0);
  const correct = results.reduce((a,r)=>a + (r.correct||0), 0);
  const acc = total ? Math.round((correct/total)*100) : 0;

  if (sumTotal) sumTotal.textContent = String(total);
  if (sumCorrect) sumCorrect.textContent = String(correct);
  if (sumAcc) sumAcc.textContent = `${acc}%`;

  const unlocked = doneCount === 3 && results.length === 3 && !!p;
  if (genBtn) genBtn.disabled = !unlocked;

  return { unlocked, total, correct, acc, profile: p };
}

genBtn?.addEventListener("click", async () => {
  const s = computeSummary();
  if (!s.unlocked) return;

  await drawChampionCard(s);
  cardZone?.classList.add("isOpen");
  cardZone?.scrollIntoView({ behavior:"smooth", block:"start" });
});

dlBtn?.addEventListener("click", () => {
  if (!cardCanvas) return;
  const a = document.createElement("a");
  a.download = "magicblock-champion-card.png";
  a.href = cardCanvas.toDataURL("image/png");
  a.click();
});

async function drawChampionCard(summary){
  const ctx = cardCanvas.getContext("2d");
  const W = cardCanvas.width, H = cardCanvas.height;

  ctx.clearRect(0,0,W,H);

  const g = ctx.createLinearGradient(0,0,W,H);
  g.addColorStop(0, "#0b0d12");
  g.addColorStop(1, "#05060a");
  ctx.fillStyle = g;
  ctx.fillRect(0,0,W,H);

  ctx.fillStyle = "rgba(255,255,255,0.06)";
  roundRect(ctx, 70, 70, W-140, H-140, 70, true, false);

  ctx.fillStyle = "rgba(0,0,0,0.28)";
  roundRect(ctx, 110, 110, W-220, H-220, 64, true, false);

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "950 86px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText("MagicBlock Champion", 160, 240);

  const name = summary.profile?.name || "Player";
  ctx.font = "900 62px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(name, 260, 520);

  await drawAvatarCircle(ctx, summary.profile?.avatar || "", 160, 472, 74);

  ctx.font = "800 46px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillStyle = "rgba(255,255,255,0.86)";
  ctx.fillText(`Correct: ${summary.correct} / ${summary.total}`, 160, 650);
  ctx.fillStyle = "rgba(255,255,255,0.70)";
  ctx.fillText(`Accuracy: ${summary.acc}%`, 160, 725);

  ctx.fillStyle = "rgba(255,255,255,0.10)";
  roundRect(ctx, 160, H-220, W-320, 96, 48, true, false);
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.font = "900 40px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText("champion card", 210, H-155);
}

function roundRect(ctx, x, y, w, h, r, fill, stroke){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr, y);
  ctx.arcTo(x+w, y, x+w, y+h, rr);
  ctx.arcTo(x+w, y+h, x, y+h, rr);
  ctx.arcTo(x, y+h, x, y, rr);
  ctx.arcTo(x, y, x+w, y, rr);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

async function drawAvatarCircle(ctx, dataUrl, cx, cy, r){
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI*2);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fill();
  ctx.clip();

  if (dataUrl && dataUrl.startsWith("data:")){
    const img = await loadImage(dataUrl);
    ctx.drawImage(img, cx-r, cy-r, r*2, r*2);
  }
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI*2);
  ctx.closePath();
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 3;
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

computeSummary();
