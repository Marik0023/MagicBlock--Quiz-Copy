const DONE_KEY  = "mb_done_song";
const SCORE_KEY = "mb_score_song";
const TOTAL_KEY = "mb_total_song";
const WHEN_KEY  = "mb_when_song";
const NAME_KEY  = "mb_name_song";
const AVATAR_KEY= "mb_avatar_song";

const letters = ["A", "B", "C", "D"];

// Для старту всюди placeholder cover.
// Потім ти просто міняєш cover на свої картинки (або зробимо авто-обкладинки).
const questions = [
  { src: "../assets/songs/01.mp3", title: "Guess the song", cover: "../assets/covers/placeholder.jpg", choices: ["Correct (edit me)", "Wrong", "Wrong", "Wrong"], correctIndex: 0 },
  { src: "../assets/songs/02.mp3", title: "Guess the song", cover: "../assets/covers/placeholder.jpg", choices: ["Wrong", "Correct (edit me)", "Wrong", "Wrong"], correctIndex: 1 },
  { src: "../assets/songs/03.mp3", title: "Guess the song", cover: "../assets/covers/placeholder.jpg", choices: ["Wrong", "Wrong", "Correct (edit me)", "Wrong"], correctIndex: 2 },
  { src: "../assets/songs/04.mp3", title: "Guess the song", cover: "../assets/covers/placeholder.jpg", choices: ["Wrong", "Wrong", "Wrong", "Correct (edit me)"], correctIndex: 3 },
  { src: "../assets/songs/05.mp3", title: "Guess the song", cover: "../assets/covers/placeholder.jpg", choices: ["Correct (edit me)", "Wrong", "Wrong", "Wrong"], correctIndex: 0 },
  { src: "../assets/songs/06.mp3", title: "Guess the song", cover: "../assets/covers/placeholder.jpg", choices: ["Wrong", "Correct (edit me)", "Wrong", "Wrong"], correctIndex: 1 },
  { src: "../assets/songs/07.mp3", title: "Guess the song", cover: "../assets/covers/placeholder.jpg", choices: ["Wrong", "Wrong", "Correct (edit me)", "Wrong"], correctIndex: 2 },
  { src: "../assets/songs/08.mp3", title: "Guess the song", cover: "../assets/covers/placeholder.jpg", choices: ["Wrong", "Wrong", "Wrong", "Correct (edit me)"], correctIndex: 3 },
  { src: "../assets/songs/09.mp3", title: "Guess the song", cover: "../assets/covers/placeholder.jpg", choices: ["Correct (edit me)", "Wrong", "Wrong", "Wrong"], correctIndex: 0 },
  { src: "../assets/songs/10.mp3", title: "Guess the song", cover: "../assets/covers/placeholder.jpg", choices: ["Wrong", "Correct (edit me)", "Wrong", "Wrong"], correctIndex: 1 },
];

let idx = 0;
let correct = 0;
let selectedIndex = null;
let dragging = false;

const audio = document.getElementById("audio");
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

// Player UI
const cover = document.getElementById("cover");
const trackTitle = document.getElementById("trackTitle");
const playBtn = document.getElementById("playBtn");
const bar = document.getElementById("bar");
const fill = document.getElementById("fill");
const knob = document.getElementById("knob");
const cur = document.getElementById("cur");
const dur = document.getElementById("dur");
const vol = document.getElementById("vol");

function nowText(){ return new Date().toLocaleString(); }

function formatTime(sec){
  sec = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2,"0")}`;
}

function setProgress(p){
  const pct = Math.max(0, Math.min(1, p));
  fill.style.width = `${pct * 100}%`;
  knob.style.left = `${pct * 100}%`;
}

function syncTimeUI(){
  cur.textContent = formatTime(audio.currentTime);
  dur.textContent = formatTime(audio.duration || 0);
  const p = audio.duration ? (audio.currentTime / audio.duration) : 0;
  setProgress(p);
}

function setPlayIcon(){
  playBtn.textContent = audio.paused ? "▶" : "⏸";
}

function tryPlay(){
  audio.play().catch(()=>{});
}

function stopAudio(){
  try { audio.pause(); audio.currentTime = 0; } catch {}
  setPlayIcon();
  syncTimeUI();
}

function seekToClientX(clientX){
  const rect = bar.getBoundingClientRect();
  const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
  const pct = rect.width ? (x / rect.width) : 0;
  if (audio.duration) audio.currentTime = pct * audio.duration;
  syncTimeUI();
}

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

function clearSelectionUI(){
  [...choicesEl.querySelectorAll("button")].forEach(b => b.classList.remove("selected"));
}

function render(){
  selectedIndex = null;
  const q = questions[idx];

  qCounter.textContent = `Question ${idx + 1} of ${questions.length}`;
  statusEl.textContent = `Progress: ${idx} / ${questions.length}`;
  nextBtn.style.display = "none";

  trackTitle.textContent = q.title || "Guess the song";
  cover.src = q.cover || "../assets/covers/placeholder.jpg";

  audio.src = q.src;
  audio.load();

  setPlayIcon();
  cur.textContent = "0:00";
  dur.textContent = "0:00";
  setProgress(0);

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
}

function next(){
  if (selectedIndex === null) return;

  // оцінювання ТІЛЬКИ тут
  const q = questions[idx];
  if (selectedIndex === q.correctIndex) correct += 1;

  stopAudio();

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
    lockedMsg.textCo
