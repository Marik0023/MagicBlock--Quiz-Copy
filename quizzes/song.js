const DONE_KEY = "mb_done_song";
const RESULT_KEY = "mb_result_song";
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
    img.style.display = "flex";
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
  }catch{
    return null;
  }
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
      <div class="small">Saved result not found. You can reset and retake:</div>
      <div class="small"><b>Open:</b> song.html?reset=1</div>
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
  if (genBtn){
    genBtn.onclick = () => generateCard(result);
  }
}

function formatTime(sec){
  if (!isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2,"0")}`;
}

/**
 * EDIT HERE: add your real audio + (optional) cover.
 * Put files into:
 *  - assets/songs/*.mp3
 *  - assets/covers/*.jpg (optional)
 */
const QUESTIONS = [
  { audio: "../assets/songs/01.mp3", cover: "../assets/covers/01.jpg", options: ["Wrong", "Correct (edit me)", "Wrong", "Wrong"], answer: 1 },
  { audio: "../assets/songs/02.mp3", cover: "", options: ["Wrong", "Wrong", "Correct (edit me)", "Wrong"], answer: 2 },
  { audio: "../assets/songs/03.mp3", cover: "", options: ["Correct (edit me)", "Wrong", "Wrong", "Wrong"], answer: 0 },
  { audio: "../assets/songs/04.mp3", cover: "", options: ["Wrong", "Wrong", "Wrong", "Correct (edit me)"], answer: 3 },
  { audio: "../assets/songs/05.mp3", cover: "", options: ["Wrong", "Correct (edit me)", "Wrong", "Wrong"], answer: 1 },
  { audio: "../assets/songs/06.mp3", cover: "", options: ["Wrong", "Wrong", "Correct (edit me)", "Wrong"], answer: 2 },
  { audio: "../assets/songs/07.mp3", cover: "", options: ["Correct (edit me)", "Wrong", "Wrong", "Wrong"], answer: 0 },
  { audio: "../assets/songs/08.mp3", cover: "", options: ["Wrong", "Wrong", "Wrong", "Correct (edit me)"], answer: 3 },
  { audio: "../assets/songs/09.mp3", cov
