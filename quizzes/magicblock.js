const DONE_KEY = "mb_done_magicblock";
const RESULT_KEY = "mb_result_magicblock";
const PROFILE_NAME_KEY = "mb_profile_name";
const PROFILE_AVATAR_KEY = "mb_profile_avatar";

function forcePlayAll(selector){
  const vids = document.querySelectorAll(selector);
  const tryPlay = () => vids.forEach(v => v.play().catch(()=>{}));
  tryPlay();
  window.addEventListener("click", tryPlay, { once:true });
  window.addEventListener("touchstart", tryPlay, { once:true });
}

function getProfile(){
  return {
    name: localStorage.getItem(PROFILE_NAME_KEY) || "Player",
    avatar: localStorage.getItem(PROFILE_AVATAR_KEY) || ""
  };
}

function renderProfilePill(){
  const slot = document.getElementById("profileSlot");
  const nameEl = document.getElementById("profileName");
  const img = document.getElementById("profileAvatarImg");
  const fallback = document.getElementById("profileAvatarFallback");
  if (!slot || !nameEl || !img || !fallback) return;

  const { name, avatar } = getProfile();
  slot.style.display = "inline-flex";
  nameEl.textContent = name;

  if (avatar){
    img.src = avatar;
    img.style.display = "block";
    fallback.style.display = "none";
  } else {
    img.style.display = "none";
    fallback.style.display = "flex";
    fallback.textContent = (name.slice(0,2) || "MB").toUpperCase();
  }

  slot.addEventListener("click", () => location.href = "../index.html");
}

function qs(name){ return new URLSearchParams(location.search).get(name); }
function resetIfAsked(){
  if (qs("reset") === "1"){
    localStorage.removeItem(DONE_KEY);
    localStorage.removeItem(RESULT_KEY);
    location.replace(location.pathname);
  }
}
function loadResult(){
  try{
    const raw = localStorage.getItem(RESULT_KEY);
    return raw ? JSON.parse(raw) : null;
  }catch{ return null; }
}
function saveResult(result){
  localStorage.setItem(DONE_KEY, "1");
  localStorage.setItem(RESULT_KEY, JSON.stringify(result));
}

function showResultScreen(result){
  const quizPanel = document.getElementById("quizPanel");
  const resultPanel = document.getElementById("resultPanel");
  const resultText = document.getElementById("resultText");
  if (!quizPanel || !resultPanel || !resultText) return;

  quizPanel.style.display = "none";
  resultPanel.style.display = "block";

  const prof = getProfile();
  if (!result){
    resultText.innerHTML = `
      <div class="small">Saved result not found. Reset and retake:</div>
      <div class="small"><b>Open:</b> magicblock.html?reset=1</div>
    `;
    return;
  }

  const date = new Date(result.completedAt);
  const when = isNaN(date.getTime()) ? "" : date.toLocaleString();

  resultText.innerHTML = `
    <div class="small"><b>${prof.name}</b></div>
    <div class="small">Completed: ${when}</div>
    <div style="height:10px;"></div>
    <div class="small"><b>Total</b> ${result.total}</div>
    <div class="small"><b>Correct</b> ${result.correct}</div>
    <div class="small"><b>Wrong</b> ${result.wrong}</div>
    <div class="small"><b>Accuracy</b> ${result.accuracy}%</div>
  `;

  const genBtn = document.getElementById("genCardBtn");
  if (genBtn) genBtn.onclick = () => generateCard(result, "MagicBlock Result");
}

/**
 * EDIT HERE: your MagicBlock questions
 */
const QUESTIONS = [
  { text: "Question 1 (edit me)", options: ["A", "B", "C", "D"], answer: 0 },
  { text: "Question 2 (edit me)", options: ["A", "B", "C", "D"], answer: 1 },
  { text: "Question 3 (edit me)", options: ["A", "B", "C", "D"], answer: 2 },
  { text: "Question 4 (edit me)", options: ["A", "B", "C", "D"], answer: 3 },
  { text: "Question 5 (edit me)", options: ["A", "B", "C", "D"], answer: 0 },
  { text: "Question 6 (edit me)", options: ["A", "B", "C", "D"], answer: 1 },
  { text: "Question 7 (edit me)", options: ["A", "B", "C", "D"], answer: 2 },
  { text: "Question 8 (edit me)", options: ["A", "B", "C", "D"], answer: 3 },
  { text: "Question 9 (edit me)", options: ["A", "B", "C", "D"], answer: 0 },
  { text: "Question 10 (edit me)", options: ["A", "B", "C", "D"], answer: 1 },
];

let idx = 0;
let correct = 0;
let selected = null;

function renderQuestion(){
  const q = QUESTIONS[idx];
  const qMeta = document.getElementById("qMeta");
  const qText = document.getElementById("qText");
  const progress = document.getElementById("progress");
  const choices = document.getElementById("choices");
  const nextBtn = document.getElementById("nextBtn");
  if (!q || !qMeta || !qText || !progress || !choices || !nextBtn) return;

  qMeta.textContent = `Question ${idx + 1} of ${QUESTIONS.length}`;
  qText.textContent = q.text;
  progress.textContent = `Progress: ${idx} / ${QUESTIONS.length}`;

  choices.innerHTML = "";
  selected = null;
  nextBtn.disabled = true;
  nextBtn.classList.remove("is-visible");
  nextBtn.style.opacity = "0";
  nextBtn.style.transform = "translateY(6px)";

  const letters = ["A","B","C","D"];
  q.options.forEach((t,i) => {
    const b = document.createElement("button");
    b.className = "choiceBtn";
    b.type = "button";
    b.textContent = `${letters[i]}) ${t}`;
    b.onclick = () => {
      selected = i;
      [...choices.children].forEach(ch => ch.classList.remove("is-selected"));
      b.classList.add("is-selected");
      nextBtn.disabled = false;
      nextBtn.style.opacity = "1";
      nextBtn.style.transform = "translateY(0)";
      nextBtn.classList.add("is-visible");
    };
    choices.appendChild(b);
  });

  nextBtn.onclick = () => {
    if (selected === null) return;
    if (selected === q.answer) correct++;
    idx++;
    if (idx >= QUESTIONS.length) finish();
    else renderQuestion();
  };
}

function finish(){
  const total = QUESTIONS.length;
  const wrong = total - correct;
  const accuracy = Math.round((correct / total) * 100);

  const result = {
    quizId: "magicblock",
    total,
    correct,
    wrong,
    accuracy,
    completedAt: new Date().toISOString()
  };

  saveResult(result);
  showResultScreen(result);
}

function roundRect(ctx, x, y, w, h, r){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr, y);
  ctx.arcTo(x+w, y, x+w, y+h, rr);
  ctx.arcTo(x+w, y+h, x, y+h, rr);
  ctx.arcTo(x, y+h, x, y, rr);
  ctx.arcTo(x, y, x+w, y, rr);
  ctx.closePath();
}

function generateCard(result, subtitle){
  const wrap = document.getElementById("cardPreviewWrap");
  const canvas = document.getElementById("cardCanvas");
  const link = document.getElementById("downloadLink");
  if (!wrap || !canvas || !link) return;

  wrap.style.display = "block";
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;

  ctx.clearRect(0,0,W,H);
  const g = ctx.createLinearGradient(0,0,W,H);
  g.addColorStop(0, "#0b0b0f");
  g.addColorStop(1, "#111118");
  ctx.fillStyle = g;
  ctx.fillRect(0,0,W,H);

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 6;
  roundRect(ctx, 48, 48, W-96, H-96, 48);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "700 72px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText("MagicBlock Quiz", 90, 150);
  ctx.font = "700 58px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText(subtitle, 90, 230);

  const prof = getProfile();
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "700 52px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText(prof.name, 90, 360);

  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "500 38px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText(`Correct: ${result.correct} / ${result.total}`, 90, 470);
  ctx.fillText(`Accuracy: ${result.accuracy}%`, 90, 530);

  const url = canvas.toDataURL("image/png");
  link.href = url;
  link.style.display = "inline-flex";
  link.textContent = "Download PNG";
}

(function init(){
  resetIfAsked();
  forcePlayAll(".bg__video");
  forcePlayAll(".brand__logo");
  renderProfilePill();

  const done = localStorage.getItem(DONE_KEY) === "1";
  if (done){
    showResultScreen(loadResult());
    return;
  }

  renderQuestion();
})();
