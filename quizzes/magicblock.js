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
  { text: "After you answer, you…", choices: ["auto-skip", "press Next", "close site", "restart"], correctIndex: 1 },
  { text: "Background is…", choices: ["static image", "looping video", "PDF", "gif only"], correctIndex: 1 },
  { text: "Completion is saved in…", choices: ["localStorage", "email", "database", "cloud"], correctIndex: 0 },
  { text: "Movie quiz uses…", choices: ["audio", "frames", "camera", "mic"], correctIndex: 1 },
  { text: "Song quiz uses…", choices: ["audio clips", "frames", "text only", "random"], correctIndex: 0 },
  { text: "Completed quizzes show…", choices: ["a badge", "a timer", "a popup", "a lockscreen"], correctIndex: 0 },
  { text: "Champion Card unlocks when…", choices: ["1 done", "2 done", "all 3 done", "never"], correctIndex: 2 },
];

let idx = 0;
let correct = 0;
let selectedIndex = null;

const qtext = document.getElementById("qtext");
const choicesEl = document.getElementById("choices");
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

function nowText(){ return new Date().toLocaleString(); }

function loadProfile(){
  playerName.value = localStorage.getItem(NAME_KEY) || "";
  avatarPreview.src = localStorage.getItem(AVATAR_KEY) || "";
}
function saveProfile(){
  localStorage.setItem(NAME_KEY, playerName.value || "");
}

function setNextText(){
  nextBtn.textContent = (idx === questions.length - 1) ? "Finish →" : "Next →";
}

function popNext(){
  nextBtn.classList.remove("is-pop");
  void nextBtn.offsetWidth;
  nextBtn.classList.add("is-pop");
}

function clearSelectionUI(){
  [...choicesEl.querySelectorAll("button")].forEach(b => b.classList.remove("selected"));
}

function render(){
  selectedIndex = null;
  const q = questions[idx];

  qCounter.textContent = `Question ${idx + 1} of ${questions.length}`;
  statusEl.textContent = `Progress: ${idx} / ${questions.length}`;

  nextBtn.style.display = "none";
  nextBtn.classList.remove("is-pop");

  qtext.textContent = q.text;

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

function pick(i){
  selectedIndex = i;
  clearSelectionUI();
  const btn = choicesEl.querySelectorAll("button")[i];
  if (btn) btn.classList.add("selected");

  setNextText();
  nextBtn.style.display = "inline-flex";
  popNext();
}

function next(){
  if (selectedIndex === null) return;

  const q = questions[idx];
  if (selectedIndex === q.correctIndex) correct += 1;

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

  nextBtn.addEventListener("click", next);
  playerName.addEventListener("input", saveProfile);

  avatarFile.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      localStorage.setItem(AVATAR_KEY, dataUrl);
      avatarPreview.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });

  render();
}

boot();
