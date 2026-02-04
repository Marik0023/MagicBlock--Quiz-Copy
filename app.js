const MB_KEYS = {
  profile: "mb_profile",
  doneSong: "mb_done_song",
  doneMovie: "mb_done_movie",
  doneMagic: "mb_done_magicblock",
  resSong: "mb_result_song",
  resMovie: "mb_result_movie",
  resMagic: "mb_result_magicblock",

  // champion persistence
  champId: "mb_champ_id",
  champPng: "mb_champ_png",
  champReady: "mb_champ_ready",
};

function safeJSONParse(v, fallback = null){
  try { return JSON.parse(v); } catch { return fallback; }
}

function inQuizzesFolder(){
  return location.pathname.includes("/quizzes/");
}
function homeHref(){
  return inQuizzesFolder() ? "../index.html" : "index.html";
}
function assetPath(p){
  return inQuizzesFolder() ? `../${p}` : p;
}

const PLACEHOLDER_AVATAR = assetPath("assets/uploadavatar.jpg");

function getProfile(){
  return safeJSONParse(localStorage.getItem(MB_KEYS.profile), null);
}
function setProfile(profile){
  localStorage.setItem(MB_KEYS.profile, JSON.stringify(profile));
}

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
forcePlayAll(".resultLogo");

const y = document.getElementById("year");
if (y) y.textContent = new Date().getFullYear();

function renderTopProfile(){
  const pill = document.getElementById("profilePill");
  if (!pill) return;

  const avatarImg = pill.querySelector("img");
  const nameEl = pill.querySelector("[data-profile-name]");
  const hintEl = pill.querySelector("[data-profile-hint]");

  const p = getProfile();
  if (!p){
    if (avatarImg) avatarImg.src = PLACEHOLDER_AVATAR;
    if (nameEl) nameEl.textContent = "Create profile";
    if (hintEl) hintEl.textContent = "Click to set";
    return;
  }

  if (avatarImg) avatarImg.src = p.avatar || PLACEHOLDER_AVATAR;
  if (nameEl) nameEl.textContent = p.name || "Player";
  if (hintEl) hintEl.textContent = inQuizzesFolder() ? "Home" : "Edit";
}

/* ===== Profile modal logic (home) ===== */
function openProfileModal(force = false){
  const modal = document.getElementById("profileModal");
  if (!modal) return;
  modal.classList.add("isOpen");

  const p = getProfile();
  const nameInput = document.getElementById("profileName");
  const fileInput = document.getElementById("profileFile");
  const preview = document.getElementById("profilePreview");
  const startBtn = document.getElementById("profileSaveBtn");
  const avatarBox = document.getElementById("avatarBox");

  if (nameInput) nameInput.value = p?.name || "";

  if (preview){
    if (p?.avatar && p.avatar.startsWith("data:")){
      preview.src = p.avatar;
      avatarBox?.classList.remove("isPlaceholder");
    } else {
      preview.src = PLACEHOLDER_AVATAR;
      avatarBox?.classList.add("isPlaceholder");
    }
  }

  if (fileInput) fileInput.value = "";

  const closeBtn = document.getElementById("profileCloseBtn");
  if (closeBtn){
    closeBtn.style.display = (force && !p) ? "none" : "flex";
  }

  if (startBtn) startBtn.disabled = false;
}

function closeProfileModal(){
  const modal = document.getElementById("profileModal");
  if (!modal) return;
  modal.classList.remove("isOpen");
}

function initProfileModal(){
  const modal = document.getElementById("profileModal");
  if (!modal) return;

  const closeBtn = document.getElementById("profileCloseBtn");
  const saveBtn = document.getElementById("profileSaveBtn");
  const nameInput = document.getElementById("profileName");
  const fileInput = document.getElementById("profileFile");
  const preview = document.getElementById("profilePreview");
  const avatarPickBtn = document.getElementById("avatarPickBtn");
  const avatarBox = document.getElementById("avatarBox");

  closeBtn?.addEventListener("click", closeProfileModal);

  avatarPickBtn?.addEventListener("click", () => {
    fileInput?.click();
  });

  fileInput?.addEventListener("change", async () => {
    const f = fileInput.files?.[0];
    if (!f) return;
    const dataUrl = await fileToDataURL(f);
    if (preview) preview.src = dataUrl;
    avatarBox?.classList.remove("isPlaceholder");
  });

  saveBtn?.addEventListener("click", () => {
    const old = getProfile() || {};
    const name = (nameInput?.value || "").trim() || "Player";

    let avatar = old.avatar || "";
    if ((preview?.src || "").startsWith("data:")) {
      avatar = preview.src;
    }

    setProfile({ name, avatar });
    renderTopProfile();
    closeProfileModal();
  });

  function fileToDataURL(file){
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }
}

/* ===== Home badges/buttons ===== */
function isDone(key){ return localStorage.getItem(key) === "1"; }

function updateChampionGlowUI(allDone){
  const champWrap = document.getElementById("championWrap");
  if (!champWrap || !allDone) return;

  const png = localStorage.getItem(MB_KEYS.champPng);
  const preview = document.getElementById("championPreview");
  const img = document.getElementById("championPreviewImg");
  const hint = document.getElementById("championHint");
  const btn = document.getElementById("openChampionBtn");

  if (png && png.startsWith("data:image/")){
    champWrap.classList.add("champion--glow");

    if (preview) preview.style.display = "block";
    if (img) img.src = png;

    if (hint) hint.style.display = "block";
    if (btn) btn.textContent = "Open Champion Card";
  } else {
    champWrap.classList.remove("champion--glow");
    if (preview) preview.style.display = "none";
    if (hint) hint.style.display = "none";
    if (btn) btn.textContent = "Generate Champion Card";
  }

  // make preview clickable
  if (preview){
    preview.style.cursor = "pointer";
    preview.onclick = () => (location.href = "champion.html");
  }
}

function updateBadges(){
  const map = {
    song: MB_KEYS.doneSong,
    movie: MB_KEYS.doneMovie,
    magicblock: MB_KEYS.doneMagic,
  };

  let allDone = true;

  Object.entries(map).forEach(([k, storageKey]) => {
    const done = isDone(storageKey);
    if (!done) allDone = false;

    const badge = document.querySelector(`[data-badge="${k}"]`);
    if (badge) badge.style.display = done ? "inline-flex" : "none";

    const btn = document.querySelector(`[data-start="${k}"]`);
    if (btn) btn.textContent = done ? "Open" : "Start";
  });

  const champ = document.getElementById("championWrap");
  if (champ) champ.style.display = allDone ? "block" : "none";

  // ✅ Glow Champion card on Home if generated
  updateChampionGlowUI(allDone);
}

function initHomeButtons(){
  const pill = document.getElementById("profilePill");

  const hasModal = !!document.getElementById("profileModal");
  if (pill){
    pill.addEventListener("click", () => {
      if (hasModal) openProfileModal(false);
      else location.href = homeHref();
    });
  }

  document.querySelectorAll("[data-start]").forEach(btn => {
    btn.addEventListener("click", () => {
      const k = btn.getAttribute("data-start");
      if (k === "song") location.href = "quizzes/song.html";
      if (k === "movie") location.href = "quizzes/movie.html";
      if (k === "magicblock") location.href = "quizzes/magicblock.html";
    });
  });

  const champBtn = document.getElementById("openChampionBtn");
  champBtn?.addEventListener("click", () => location.href = "champion.html");
}

/* ===== Bootstrap ===== */
renderTopProfile();
initProfileModal();
updateBadges();
initHomeButtons();

const mustCreate = document.body.getAttribute("data-require-profile") === "1";
if (mustCreate && !getProfile()){
  openProfileModal(true);
}
