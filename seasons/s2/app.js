const MB_KEYS = {
  profile: "mb_profile",

  // Season 2 done flags
  doneMovieFrame: "mb_s2_done_movieframe",
  doneMovieEmoji: "mb_s2_done_movieemoji",
  doneSong: "mb_s2_done_song",
  doneTrueFalse: "mb_s2_done_truefalse",
  doneSilhouette: "mb_s2_done_silhouette",
  doneMagic: "mb_s2_done_magicblock",

  // Season 2 progress (resume)
  progMovieFrame: "mb_s2_prog_movieframe",
  progMovieEmoji: "mb_s2_prog_movieemoji",
  progSong: "mb_s2_prog_song",
  progTrueFalse: "mb_s2_prog_truefalse",
  progSilhouette: "mb_s2_prog_silhouette",
  progMagic: "mb_s2_prog_magicblock",

  // Optional state blobs
  progMovieFrameState: "mb_s2_prog_movieframe_state",
  progMovieEmojiState: "mb_s2_prog_movieemoji_state",
  progSongState: "mb_s2_prog_song_state",
  progTrueFalseState: "mb_s2_prog_truefalse_state",
  progSilhouetteState: "mb_s2_prog_silhouette_state",
  progMagicState: "mb_s2_prog_magicblock_state",
};

function safeJSONParse(v, fallback = null){
  try { return JSON.parse(v); } catch { return fallback; }
}

function inQuizzesFolder(){
  return location.pathname.includes("/quizzes/");
}

/**
 * ✅ Correct assets prefix for GitHub Pages project site:
 * - /seasons/s2/index.html        => ../../assets/...
 * - /seasons/s2/quizzes/x.html    => ../../../assets/...
 */
function assetsPrefix(){
  if (location.pathname.includes("/seasons/")){
    return inQuizzesFolder() ? "../../../" : "../../";
  }
  return "./";
}

function assetPath(p){
  return assetsPrefix() + p; // p like "assets/xxx.png"
}

const PLACEHOLDER_AVATAR = assetPath("assets/uploadavatar.jpg");

/* ===== autoplay helper (bg/logo videos) ===== */
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

/* ===== Profile ===== */
function getProfile(){
  return safeJSONParse(localStorage.getItem(MB_KEYS.profile), null);
}

function setProfile(profile){
  try{
    localStorage.setItem(MB_KEYS.profile, JSON.stringify(profile));
    return true;
  } catch (e){
    console.error("setProfile failed:", e);
    alert("Storage is full. Try smaller avatar image.");
    return false;
  }
}

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
  if (hintEl) hintEl.textContent = "Edit";
}

/* ===== Profile modal ===== */
function openProfileModal(force = false){
  const modal = document.getElementById("profileModal");
  if (!modal) return;

  const p = getProfile();
  const isEdit = !!p;

  modal.classList.add("isOpen");

  const nameInput = document.getElementById("profileName");
  const fileInput = document.getElementById("profileFile");
  const preview = document.getElementById("profilePreview");
  const saveBtn = document.getElementById("profileSaveBtn");
  const avatarBox = document.getElementById("avatarBox");

  if (saveBtn) saveBtn.textContent = isEdit ? "Edit" : "Start";
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

  if (saveBtn) saveBtn.disabled = false;
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
  avatarPickBtn?.addEventListener("click", () => fileInput?.click());

  fileInput?.addEventListener("change", async () => {
    const f = fileInput.files?.[0];
    if (!f) return;

    const dataUrl = await fileToCompressedDataURL(f, 512, 0.85);

    if (preview) preview.src = dataUrl;
    avatarBox?.classList.remove("isPlaceholder");
  });

  saveBtn?.addEventListener("click", () => {
    const old = getProfile() || {};
    const name = (nameInput?.value || "").trim() || "Player";

    let avatar = old.avatar || "";
    if ((preview?.src || "").startsWith("data:")) avatar = preview.src;

    const ok = setProfile({ name, avatar });
    if (!ok) return;

    renderTopProfile();
    closeProfileModal();
  });

  function fileToCompressedDataURL(file, maxSize = 512, quality = 0.85){
    return new Promise((resolve, reject) => {
      const img = new Image();
      const r = new FileReader();

      r.onload = () => { img.src = r.result; };
      r.onerror = reject;
      r.readAsDataURL(file);

      img.onload = () => {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;

        const scale = Math.min(1, maxSize / Math.max(w, h));
        const nw = Math.round(w * scale);
        const nh = Math.round(h * scale);

        const c = document.createElement("canvas");
        c.width = nw; c.height = nh;

        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0, nw, nh);

        resolve(c.toDataURL("image/jpeg", quality));
      };

      img.onerror = reject;
    });
  }
}

/* ===== Progress helpers ===== */
function getProgNum(key){
  const n = Number(localStorage.getItem(key) || "0");
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(10, n));
}

function isDone(key){ return localStorage.getItem(key) === "1"; }

/* ===== Badges + mini progress ===== */
function updateMiniProgressUI(){
  const total = 10;

  const map = {
    movieframe: { progKey: MB_KEYS.progMovieFrame, doneKey: MB_KEYS.doneMovieFrame },
    movieemoji: { progKey: MB_KEYS.progMovieEmoji, doneKey: MB_KEYS.doneMovieEmoji },
    song: { progKey: MB_KEYS.progSong, doneKey: MB_KEYS.doneSong },
    truefalse: { progKey: MB_KEYS.progTrueFalse, doneKey: MB_KEYS.doneTrueFalse },
    silhouette: { progKey: MB_KEYS.progSilhouette, doneKey: MB_KEYS.doneSilhouette },
    magicblock: { progKey: MB_KEYS.progMagic, doneKey: MB_KEYS.doneMagic },
  };

  Object.entries(map).forEach(([k, keys]) => {
    const wrap = document.querySelector(`.miniProg[data-prog="${k}"]`);
    if (!wrap) return;

    if (isDone(keys.doneKey)){
      wrap.style.display = "none";
      return;
    }

    const nextQ = getProgNum(keys.progKey);
    if (nextQ < 2){
      wrap.style.display = "none";
      return;
    }

    const answered = Math.min(total, Math.max(0, nextQ - 1));
    const pct = Math.round((answered / total) * 100);

    wrap.style.display = "flex";

    const fill = wrap.querySelector(".miniProg__fill");
    const text = wrap.querySelector(".miniProg__text");
    if (fill) fill.style.width = `${pct}%`;
    if (text) text.textContent = `${pct}%`;
  });
}

function updateBadges(){
  const map = {
    movieframe: { doneKey: MB_KEYS.doneMovieFrame, progKey: MB_KEYS.progMovieFrame },
    movieemoji: { doneKey: MB_KEYS.doneMovieEmoji, progKey: MB_KEYS.progMovieEmoji },
    song: { doneKey: MB_KEYS.doneSong, progKey: MB_KEYS.progSong },
    truefalse: { doneKey: MB_KEYS.doneTrueFalse, progKey: MB_KEYS.progTrueFalse },
    silhouette: { doneKey: MB_KEYS.doneSilhouette, progKey: MB_KEYS.progSilhouette },
    magicblock: { doneKey: MB_KEYS.doneMagic, progKey: MB_KEYS.progMagic },
  };

  Object.entries(map).forEach(([k, keys]) => {
    const done = isDone(keys.doneKey);

    const badge = document.querySelector(`[data-badge="${k}"]`);
    if (badge) badge.style.display = done ? "inline-flex" : "none";

    const btn = document.querySelector(`[data-start="${k}"]`);
    if (!btn) return;

    if (done){
      btn.textContent = "Open";
      return;
    }

    const nextQ = getProgNum(keys.progKey);
    btn.textContent = (nextQ >= 2) ? "Continue" : "Start";
  });

  updateMiniProgressUI();
}

/* ===== Home buttons ===== */
function initHomeButtons(){
  const pill = document.getElementById("profilePill");
  if (pill){
    pill.addEventListener("click", () => openProfileModal(false));
  }

  document.querySelectorAll("[data-start]").forEach(btn => {
    btn.addEventListener("click", () => {
      const k = btn.getAttribute("data-start");
      if (k === "movieframe") location.href = "quizzes/movieframe.html";
      if (k === "movieemoji") location.href = "quizzes/movieemoji.html";
      if (k === "song") location.href = "quizzes/song.html";
      if (k === "truefalse") location.href = "quizzes/truefalse.html";
      if (k === "silhouette") location.href = "quizzes/silhouette.html";
      if (k === "magicblock") location.href = "quizzes/magicblock.html";
    });
  });
}

/* ===== Rewards modal ===== */
(function initRewardsModal(){
  const rewardsBtn = document.getElementById("rewardsBtn");
  const modal = document.getElementById("rewardsModal");
  const closeBtn = document.getElementById("rewardsCloseBtn");
  const grid = document.getElementById("rewardsGrid");

  if (!rewardsBtn || !modal || !closeBtn || !grid) return;

  function open(){
    // поки що можеш залишити пустим або додати карточки згодом
    grid.innerHTML = "<div class='footerSmall'>Coming soon…</div>";
    modal.classList.add("isOpen");
  }
  function close(){ modal.classList.remove("isOpen"); }

  rewardsBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
})();

/* ===== Bootstrap ===== */
renderTopProfile();
initProfileModal();
updateBadges();
initHomeButtons();

const mustCreate = document.body.getAttribute("data-require-profile") === "1";
if (mustCreate && !getProfile()){
  openProfileModal(true);
}
