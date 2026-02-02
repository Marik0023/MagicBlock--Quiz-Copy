const DONE_KEY  = "mb_done_magicblock";
const SCORE_KEY = "mb_score_magicblock";
const TOTAL_KEY = "mb_total_magicblock";
const WHEN_KEY  = "mb_when_magicblock";
const NAME_KEY  = "mb_name_magicblock";
const AVATAR_KEY= "mb_avatar_magicblock";

const letters = ["A", "B", "C", "D"];

const questions = [
  { text: "MagicBlock is…", choices: ["a quiz site", "a band", "a game", "a restaurant"], correctIndex: 0 },
  { text: "This site is hosted on…", choices: ["GitHub Pages", "Steam", "App Store", "Netflix"], correctIndex: 0 },
  { text: "A quiz question has…", choices: ["2 options", "3 options", "4 options", "10 options"], correctIndex: 2 },
  { text: "If you answer wrong, you…", choices: ["restart", "still press Next", "close site", "get banned"], correctIndex: 1 },
  { text: "The background is…", choices: ["a static image", "a looping video", "a PDF", "a screenshot"], correctIndex: 1 },
  { text: "Your completion is saved in…", choices: ["localStorage", "email", "database", "cloud drive"], correctIndex: 0 },
  { text: "Movie quiz uses…", choices: ["audio", "frames", "microphone", "camera"], correctIndex: 1 },
  { text: "Song quiz uses…", choices: ["audio clips", "frames", "text only", "random"], correctIndex: 0 },
  { text: "Completed quizzes show…", choices: ["a badge", "a timer", "a popup", "a lock screen"], correctIndex: 0 },
  { text: "Champion Card unlocks when…", choices: ["1 quiz done", "2 quizzes done", "all 3 done", "never"], correctIndex: 2 },
];

let idx = 0;
let correct = 0;
let answered = false;

const qtext = document.getElementById("qtext");
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
  return new Date().toLocaleString();
}

function showAvatar(dataUrl){
  avatarPreview.src = dataUrl || "";
}

function loadProfile(){
  playerName.value = localStorage.getItem(NAME_KEY) || "";
  showAvatar(localStorage.getItem(AVATAR_KEY) || "");
}

function saveProfile(){
  localStorage.setItem(NAME_KEY, playerName.value || "");
}

function lockButtons(){
  [...choicesEl.querySelectorAll("button")].forEach(b => b.disabled = true);
}

function setNextText(){
  nextBtn.textContent = (idx === questions.length - 1) ? "Finish" : "Next";
}

function render(){
  answered = false;
  const q = questions[idx];

  qCounter.textContent = `Question ${idx + 1} of ${questions.length}`;
  statusEl.textContent = `Score: ${correct} / ${idx}`;
  feedbackEl.textContent = "";
  nextBtn.style.display = "none";

  qtext.textContent = q.text;

  choicesEl.innerHTML = "";
  q.choices.forEach((text, i) => {
    const btn = document.createElement("button");
    btn.className = "btn choiceBtn";
    btn.type = "button";
    btn.textContent = `${letters[i]}) ${text}`;
    btn.addEventListener("click", () => pick(i, btn));
    choicesEl.appendChild(btn);
  });
}

function pick(choiceIndex, btnEl){
  if (answered) return;
  answered = true;

  const q = questions[idx];
  lockButtons();

  btnEl.classList.add("selected");
  const correctBtn = choicesEl.querySelectorAll("button")[q.correctIndex];

  const ok = choiceIndex === q.correctIndex;
  if (ok){
    correct += 1;
    btnEl.classList.add("correct");
    feedbackEl.textContent = "✅ Correct!";
  } else {
    btnEl.classList.add("wrong");
    if (correctBtn) correctBtn.classList.add("correct");

    const right = `${letters[q.correctIndex]}) ${q.choices[q.correctIndex]}`;
    feedbackEl.textContent = `❌ Wrong. Correct answer: ${right}`;
  }

  statusEl.textContent = `Score: ${correct} / ${idx + 1}`;

  setNextText();
  nextBtn.style.display = "inline-flex";
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

  if (showLockText){
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
    const dataUrl = String(reader.result);
    localStorage.setItem(AVATAR_KEY, dataUrl);
    showAvatar(dataUrl);
  };
  reader.readAsDataURL(file);
});

boot();
