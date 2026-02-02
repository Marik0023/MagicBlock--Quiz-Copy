const QUIZ = "movie";
const DONE_KEY  = "mb_done_movie";
const SCORE_KEY = "mb_score_movie";
const TOTAL_KEY = "mb_total_movie";
const WHEN_KEY  = "mb_when_movie";
const NAME_KEY  = "mb_name_movie";
const AVATAR_KEY= "mb_avatar_movie";

const letters = ["A", "B", "C", "D"];

// ✅ 10 питань (потім міняєш choices + correctIndex + файли)
const questions = [
  { src: "../assets/movies/01.jpg", choices: ["Correct (edit me)", "Wrong", "Wrong", "Wrong"], correctIndex: 0 },
  { src: "../assets/movies/02.jpg", choices: ["Wrong", "Correct (edit me)", "Wrong", "Wrong"], correctIndex: 1 },
  { src: "../assets/movies/03.jpg", choices: ["Wrong", "Wrong", "Correct (edit me)", "Wrong"], correctIndex: 2 },
  { src: "../assets/movies/04.jpg", choices: ["Wrong", "Wrong", "Wrong", "Correct (edit me)"], correctIndex: 3 },
  { src: "../assets/movies/05.jpg", choices: ["Correct (edit me)", "Wrong", "Wrong", "Wrong"], correctIndex: 0 },
  { src: "../assets/movies/06.jpg", choices: ["Wrong", "Correct (edit me)", "Wrong", "Wrong"], correctIndex: 1 },
  { src: "../assets/movies/07.jpg", choices: ["Wrong", "Wrong", "Correct (edit me)", "Wrong"], correctIndex: 2 },
  { src: "../assets/movies/08.jpg", choices: ["Wrong", "Wrong", "Wrong", "Correct (edit me)"], correctIndex: 3 },
  { src: "../assets/movies/09.jpg", choices: ["Correct (edit me)", "Wrong", "Wrong", "Wrong"], correctIndex: 0 },
  { src: "../assets/movies/10.jpg", choices: ["Wrong", "Correct (edit me)", "Wrong", "Wrong"], correctIndex: 1 },
];

let idx = 0;
let correct = 0;

const frame = document.getElementById("frame");
const choicesEl = document.getElementById("choices");
const feedbackEl = document.getElementById("feedback");
const statusEl = document.getElementById("status");
const nextBtn = document.getElementById("next");
const qCounter = document.getElementById("qCounter");
const lockedMsg = document.getElementById("lockedMsg");

const quizUI = document.getElementById("quizUI");
const resultUI = document.getElementById("resultUI");

const rTotal = document.getElementById("rTotal");
const rCorrect = document.getElementById("rCorrect");
const rWrong = document.getElementById("rWrong");
const rPercent = document.getElementById("rPercent");
const rWhen = document.getElementById("rWhen");

const playerName = document.getElementById("playerName");
const avatarFile = document.getElementById("avatarFile");
const avatarPreview = document.getElementById("avatarPreview");

function nowText(){
  const d = new Date();
  return d.toLocaleString();
}

function saveProfile(){
  localStorage.setItem(NAME_KEY, playerName.value || "");
}

function showAvatar(dataUrl){
  avatarPreview.src = dataUrl || "";
}

function loadProfile(){
  playerName.value = localStorage.getItem(NAME_KEY) || "";
  const av = localStorage.getItem(AVATAR_KEY) || "";
  showAvatar(av);
}

function lockButtons(){
  [...choicesEl.querySelectorAll("button")].forEach(b => b.disabled = true);
}

function render(){
  const q = questions[idx];

  qCounter.textContent = `Question ${idx + 1} of ${questions.length}`;
  statusEl.textContent = `Score: ${correct} / ${idx}`;
  feedbackEl.textContent = "";
  nextBtn.style.display = "none";

  frame.src = q.src;

  choicesEl.innerHTML = "";
  q.choices.forEach((text, i) => {
    const btn = document.createElement("button");
    btn.className = "btn choiceBtn";
    btn.type = "button";
    btn.textContent = `${letters[i]}) ${text}`;
    btn.addEventListener("click", () => pick(i));
    choicesEl.appendChild(btn);
  });
}

function pick(choiceIndex){
  const q = questions[idx];
  lockButtons();

  const ok = choiceIndex === q.correctIndex;

  if (ok){
    correct += 1;
    feedbackEl.textContent = "✅ Correct!";
    nextBtn.style.display = "inline-flex";
    nextBtn.textContent = (idx === questions.length - 1) ? "Finish" : "Next";
    statusEl.textContent = `Score: ${correct} / ${idx + 1}`;
    return;
  }

  const right = `${letters[q.correctIndex]}) ${q.choices[q.correctIndex]}`;
  feedbackEl.textContent = `❌ Wrong. Correct answer: ${right}. Moving on…`;
  statusEl.textContent = `Score: ${correct} / ${idx + 1}`;

  setTimeout(next, 750);
}

function next(){
  if (idx < questions.length - 1){
    idx += 1;
    render();
  } else {
    finish();
  }
}

function finish(){
  localStorage.setItem(DONE_KEY, "1");
  localStorage.setItem(SCORE_KEY, String(correct));
  localStorage.setItem(TOTAL_KEY, String(questions.length));
  localStorage.setItem(WHEN_KEY, nowText());

  showResult(true);
}

function showResult(showLockText){
  quizUI.style.display = "none";
  resultUI.style.display = "block";

  const total = Number(localStorage.getItem(TOTAL_KEY) || questions.length);
  const c = Number(localStorage.getItem(SCORE_KEY) || correct);
  const wrong = total - c;
  const percent = total ? Math.round((c / total) * 100) : 0;

  rTotal.textContent = String(total);
  rCorrect.textContent = String(c);
  rWrong.textContent = String(wrong);
  rPercent.textContent = `${percent}%`;

  const when = localStorage.getItem(WHEN_KEY) || "";
  rWhen.textContent = when ? `Completed: ${when}` : "";

  if (showLockText) {
    lockedMsg.style.display = "block";
    lockedMsg.textContent = "Quiz completed. You can’t take it again.";
  }

  loadProfile();
}

function boot(){
  if (localStorage.getItem(DONE_KEY) === "1"){
    lockedMsg.style.display = "block";
    lockedMsg.textContent = "You already completed this quiz.";
    showResult(false);
    return;
  }
  render();
}

nextBtn.addEventListener("click", next);

playerName.addEventListener("input", saveProfile);

avatarFile.addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    localStorage.setItem(AVATAR_KEY, String(dataUrl));
    showAvatar(String(dataUrl));
  };
  reader.readAsDataURL(file);
});

boot();

