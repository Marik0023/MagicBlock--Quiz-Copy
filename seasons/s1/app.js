const MB_KEYS = {
  profile: "mb_profile",

  doneSong: "mb_done_song",
  doneMovie: "mb_done_movie",
  doneMagic: "mb_done_magicblock",

  resSong: "mb_result_song",
  resMovie: "mb_result_movie",
  resMagic: "mb_result_magicblock",

  // progress (resume) — NUMBER 0..10 (show only if >=1)
  progSong: "mb_prog_song",
  progMovie: "mb_prog_movie",
  progMagic: "mb_prog_magicblock",

  // optional progress JSON state (not used on home)
  progSongState: "mb_prog_song_state",
  progMovieState: "mb_prog_movie_state",
  progMagicState: "mb_prog_magicblock_state",

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
function championHref(){
  return inQuizzesFolder() ? "../champion.html" : "champion.html";
}
function assetPath(p){
  return inQuizzesFolder() ? `../${p}` : p;
}

const PLACEHOLDER_AVATAR = assetPath("assets/uploadavatar.jpg");

function getProfile(){
  return safeJSONParse(localStorage.getItem(MB_KEYS.profile), null);
}

/**
 * ✅ If storage full -> clear champion PNG and retry later
 */
function setProfile(profile){
  try{
    localStorage.setItem(MB_KEYS.profile, JSON.stringify(profile));
    return true;
  } catch (e){
    console.error("setProfile failed:", e);

    // free space: champion PNG can be huge
    localStorage.removeItem(MB_KEYS.champPng);
    localStorage.removeItem(MB_KEYS.champReady);

    alert("Storage was full. I cleared Champion preview. Try saving avatar again.");
    return false;
  }
}

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
forcePlayAll(".resultLogo");

const y = document.getElementById("year");
if (y) y.textContent = new Date().getFullYear();

/* ===== progress helpers (HOME) ===== */
function getProgNum(key){
  const n = Number(localStorage.getItem(key) || "0");
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(10, n));
}

function clearProgressForQuiz(k){
  if (k === "song"){
    localStorage.removeItem(MB_KEYS.progSong);
    localStorage.removeItem(MB_KEYS.progSongState);
  }
  if (k === "movie"){
    localStorage.removeItem(MB_KEYS.progMovie);
    localStorage.removeItem(MB_KEYS.progMovieState);
  }
  if (k === "magicblock"){
    localStorage.removeItem(MB_KEYS.progMagic);
    localStorage.removeItem(MB_KEYS.progMagicState);
  }
}

/* ===== Profile pill ===== */
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
// function openProfileModal(force = false){
//   const modal = document.getElementById("profileModal");
//   if (!modal) return;
//   modal.classList.add("isOpen");

//   const p = getProfile();
//   const nameInput = document.getElementById("profileName");
//   const fileInput = document.getElementById("profileFile");
//   const preview = document.getElementById("profilePreview");
//   const saveBtn = document.getElementById("profileSaveBtn");
//   const avatarBox = document.getElementById("avatarBox");

//   if (nameInput) nameInput.value = p?.name || "";

//   if (preview){
//     if (p?.avatar && p.avatar.startsWith("data:")){
//       preview.src = p.avatar;
//       avatarBox?.classList.remove("isPlaceholder");
//     } else {
//       preview.src = PLACEHOLDER_AVATAR;
//       avatarBox?.classList.add("isPlaceholder");
//     }
//   }

//   if (fileInput) fileInput.value = "";

//   const closeBtn = document.getElementById("profileCloseBtn");
//   if (closeBtn){
//     closeBtn.style.display = (force && !p) ? "none" : "flex";
//   }

//   if (saveBtn) saveBtn.disabled = false;
// }
function openProfileModal(force = false){
  const modal = document.getElementById("profileModal");
  if (!modal) return;

  const p = getProfile();
  const isEdit = !!p; // ✅ якщо профіль вже є — це режим редагування

  modal.classList.add("isOpen");

  const nameInput = document.getElementById("profileName");
  const fileInput = document.getElementById("profileFile");
  const preview = document.getElementById("profilePreview");
  const saveBtn = document.getElementById("profileSaveBtn");
  const avatarBox = document.getElementById("avatarBox");

  // ✅ ЗМІНА: підпис кнопки залежно від режиму
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

  if (preview){
    preview.style.cursor = "pointer";
    preview.onclick = () => (location.href = championHref());
  }
}

/* ✅ HOME: mini progress under each button */
function updateMiniProgressUI(){
  const total = 10;

  const map = {
    song: { progKey: MB_KEYS.progSong, doneKey: MB_KEYS.doneSong },
    movie: { progKey: MB_KEYS.progMovie, doneKey: MB_KEYS.doneMovie },
    magicblock: { progKey: MB_KEYS.progMagic, doneKey: MB_KEYS.doneMagic },
  };

  Object.entries(map).forEach(([k, keys]) => {
    const wrap = document.querySelector(`.miniProg[data-prog="${k}"]`);
    if (!wrap) return;

    // completed => hide
    if (localStorage.getItem(keys.doneKey) === "1"){
      wrap.style.display = "none";
      return;
    }

    // prog = next question number (1..10). Show ONLY if user already answered >=1 => prog >= 2
    const nextQ = getProgNum(keys.progKey);
    if (nextQ < 2){
      wrap.style.display = "none";
      return;
    }

    const answered = Math.min(total, Math.max(0, nextQ - 1)); // 2 -> 1 answered
    const pct = Math.round((answered / total) * 100);

    wrap.style.display = "flex";

    const fill = wrap.querySelector(".miniProg__fill");
    const text = wrap.querySelector(".miniProg__text");
    if (fill) fill.style.width = `${pct}%`;
    if (text) text.textContent = `${pct}%`;
  });
}

/**
 * ✅ Buttons logic:
 * - Done => "Open"
 * - Not done + progress exists => "Continue"
 * - Not done + no progress => "Start"
 * Also clears progress if done.
 */
function updateBadges(){
  const map = {
    song: { doneKey: MB_KEYS.doneSong, progKey: MB_KEYS.progSong },
    movie: { doneKey: MB_KEYS.doneMovie, progKey: MB_KEYS.progMovie },
    magicblock: { doneKey: MB_KEYS.doneMagic, progKey: MB_KEYS.progMagic },
  };

  let allDone = true;

  Object.entries(map).forEach(([k, keys]) => {
    const done = isDone(keys.doneKey);
    if (!done) allDone = false;

    if (done){
      clearProgressForQuiz(k);
    }

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

  const champ = document.getElementById("championWrap");
  if (champ) champ.style.display = allDone ? "block" : "none";

  updateChampionGlowUI(allDone);
  updateMiniProgressUI();
}

function initHomeButtons(){
  // ✅ Seasons button (back to season picker)
  const seasonsBtn = document.getElementById("seasonsBtn");
  if (seasonsBtn){
    seasonsBtn.addEventListener("click", (e) => {
      e.preventDefault();
      location.href = "../../index.html"; // from /seasons/s1/ -> /index.html
    });
  }

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
  champBtn?.addEventListener("click", () => location.href = championHref());
}

/* ===== Bootstrap ===== */
renderTopProfile();
initProfileModal();
updateBadges();

// ✅ CALL HERE (Step 3)
const allDone =
  isDone(MB_KEYS.doneSong) &&
  isDone(MB_KEYS.doneMovie) &&
  isDone(MB_KEYS.doneMagic);

updateFooterHint(allDone); 
initHomeButtons();

// === Bonus ===
function updateFooterHint(isChampionUnlocked) {
  const el = document.getElementById("footerHint");
  if (!el) return;

  if (isChampionUnlocked) {
    el.style.display = "none"; // hide completely
  } else {
    el.style.display = "";
    el.textContent = "Complete all 3 quizzes to unlock an exclusive bonus ✨";
  }
}

const mustCreate = document.body.getAttribute("data-require-profile") === "1";
if (mustCreate && !getProfile()){
  openProfileModal(true);
}

/* ===== Rewards Modal (Home) ===== */
(function initRewardsModal(){
  const rewardsBtn = document.getElementById("rewardsBtn");
  const modal = document.getElementById("rewardsModal");
  const closeBtn = document.getElementById("rewardsCloseBtn");
  const grid = document.getElementById("rewardsGrid");

  if (!rewardsBtn || !modal || !closeBtn || !grid) return;

  const REWARD_KEYS = {
    songPng: "mb_prev_song",
    moviePng: "mb_prev_movie",
    magicPng: "mb_prev_magicblock",
  };

  const items = [
    {
      key: "song",
      title: "Quiz 1 — Song",
      sub: "Guess the Song by the Melody",
      doneKey: MB_KEYS.doneSong,
      progKey: MB_KEYS.progSong,
      pngKey: REWARD_KEYS.songPng,
      openHref: "quizzes/song.html"
    },
    {
      key: "movie",
      title: "Quiz 2 — Movie",
      sub: "Guess the Movie by the Frame",
      doneKey: MB_KEYS.doneMovie,
      progKey: MB_KEYS.progMovie,
      pngKey: REWARD_KEYS.moviePng,
      openHref: "quizzes/movie.html"
    },
    {
      key: "magicblock",
      title: "Quiz 3 — MagicBlock",
      sub: "How well do you know MagicBlock?",
      doneKey: MB_KEYS.doneMagic,
      progKey: MB_KEYS.progMagic,
      pngKey: REWARD_KEYS.magicPng,
      openHref: "quizzes/magicblock.html"
    },
    {
      key: "champion",
      title: "Champion Card",
      sub: "Unlocked after all 3 quizzes",
      doneKey: null,
      progKey: null,
      pngKey: MB_KEYS.champPng,
      openHref: "champion.html"
    }
  ];

  function open(){
    render();
    modal.classList.add("isOpen");
  }
  function close(){
    modal.classList.remove("isOpen");
  }

  rewardsBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });

  function isDoneLocal(key){
    return key ? localStorage.getItem(key) === "1" : false;
  }

  function render(){
    grid.innerHTML = "";

    const allDone =
      isDoneLocal(MB_KEYS.doneSong) &&
      isDoneLocal(MB_KEYS.doneMovie) &&
      isDoneLocal(MB_KEYS.doneMagic);

    items.forEach(it => {
      const png = localStorage.getItem(it.pngKey || "");
      const hasPng = !!(png && png.startsWith("data:image/"));
      const done = it.doneKey ? isDoneLocal(it.doneKey) : null;

      if (it.key === "song" && done) clearProgressForQuiz("song");
      if (it.key === "movie" && done) clearProgressForQuiz("movie");
      if (it.key === "magicblock" && done) clearProgressForQuiz("magicblock");

      const nextQ = it.progKey ? getProgNum(it.progKey) : 0;
      const hasProg = !done && nextQ >= 2;

      const isChampion = it.key === "champion";

      const card = document.createElement("div");
      card.className = "rewardCard";

      const thumb = document.createElement("div");
      thumb.className = "rewardThumb";

      if (hasPng){
        const img = document.createElement("img");
        img.alt = it.title;
        img.src = png;
        thumb.appendChild(img);
      } else {
        if (isChampion && !allDone) thumb.textContent = "Locked 🔒";
        else thumb.textContent = "Not generated";
      }

      const meta = document.createElement("div");
      meta.className = "rewardMeta";

      const t = document.createElement("div");
      t.className = "rewardTitle";
      t.textContent = it.title;

      const s = document.createElement("div");
      s.className = "rewardSub";

      if (isChampion){
        s.textContent = allDone
          ? (hasPng ? "Ready ✅" : "Unlocked ✅ (generate on Champion page)")
          : "Locked (complete all quizzes)";
      } else {
        if (done) s.textContent = hasPng ? "Ready ✅" : "Completed ✅ (generate card inside quiz)";
        else if (hasProg) s.textContent = `In progress — Q${nextQ - 1} / 10`;
        else s.textContent = "Not completed";
      }

      const actions = document.createElement("div");
      actions.className = "rewardActions";

      const openBtn = document.createElement("button");
      openBtn.className = "btn";

      if (isChampion){
        openBtn.textContent = allDone ? "Open Champion" : "Locked";
        openBtn.disabled = !allDone;
      } else {
        if (done) openBtn.textContent = "Open quiz";
        else openBtn.textContent = hasProg ? "Continue" : "Start";
      }

      openBtn.addEventListener("click", () => {
        if (isChampion && !allDone) return;
        location.href = it.openHref;
      });

      actions.appendChild(openBtn);

      if (hasPng){
        const dl = document.createElement("button");
        dl.className = "btn btn--ghost";
        dl.textContent = "Download";
        dl.addEventListener("click", () => downloadDataUrl(png, filenameFor(it.key, png)));
        actions.appendChild(dl);
      }

      meta.appendChild(t);
      meta.appendChild(s);
      meta.appendChild(actions);

      card.appendChild(thumb);
      card.appendChild(meta);

      grid.appendChild(card);
    });
  }

  function filenameFor(key, dataUrl){
    const isJpg = (dataUrl || "").startsWith("data:image/jpeg");
    const ext = isJpg ? "jpg" : "png";

    if (key === "song") return `magicblock-song-result.${ext}`;
    if (key === "movie") return `magicblock-movie-result.${ext}`;
    if (key === "magicblock") return `magicblock-knowledge-result.${ext}`;
    return `magicblock-champion-card.${ext}`;
  }

  function downloadDataUrl(dataUrl, filename){
    const a = document.createElement("a");
    a.download = filename;
    a.href = dataUrl;
    a.click();
  }

  // Allow deeplink: .../seasons/s1/index.html#achievements
  if (location.hash === "#achievements") {
    open();
    // clean hash so refresh doesn't re-open forever
    try { history.replaceState(null, "", location.pathname + location.search); } catch {}
  }
})();
