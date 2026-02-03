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
renderTopProfile();

/**
 * TODO: підстав свої фрейми.
 * frame: шлях відносно quizzes/ (тобто ../assets/....)
 */
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
if (done && saved){
  showResult(saved);
} else {
  renderQuestion();
}

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
  if (!r) return;

  await drawResultCard({
    title: "Movie Quiz",
    profile: p,
    total: r.total,
    correct: r.correct,
    acc: r.acc
  });

  cardZone.classList.add("isOpen");
  cardZone.scrollIntoView({ behavior:"smooth", block:"start" });
});

dlBtn.addEventListener("click", () => {
  const a = document.createElement("a");
  a.download = "magicblock-movie-result.png";
  a.href = cardCanvas.toDataURL("image/png");
  a.click();
});

async function drawResultCard(data){
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
  ctx.fillText("MagicBlock Quiz", 160, 240);

  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.font = "900 54px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(data.title, 160, 320);

  const name = data.profile?.name || "Player";
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "900 62px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(name, 260, 520);

  await drawAvatarCircle(ctx, data.profile?.avatar || "", 160, 472, 74);

  ctx.font = "800 46px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillStyle = "rgba(255,255,255,0.86)";
  ctx.fillText(`Correct: ${data.correct} / ${data.total}`, 160, 650);
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.fillText(`Accuracy: ${data.acc}%`, 160, 725);

  ctx.fillStyle = "rgba(255,255,255,0.10)";
  roundRect(ctx, 160, H-220, W-320, 96, 48, true, false);
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.font = "900 40px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText("result card", 210, H-155);
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
    const size = r*2;
    ctx.drawImage(img, cx-r, cy-r, size, size);
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
