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
 * ✅ FIX 2: if storage full -> clear champion PNG and retry later
 * returns true/false
 */
function setProfile(profile){
  try{
    localStorage.setItem(MB_KEYS.profile, JSON.stringify(profile));
    return true;
  } catch (e){
    console.error("setProfile failed:", e);

    // free space: champion PNG is huge
    localStorage.removeItem(MB_KEYS.champPng);
    localStorage.removeItem(MB_KEYS.champReady);

    alert("Storage was full. I cleared Champion preview. Try saving avatar again.");
    return false;
  }
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

    // ✅ compress avatar to avoid localStorage quota
    const dataUrl = await fileToCompressedDataURL(f, 512, 0.85);

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

        // JPEG is much smaller for photos
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

  // make preview clickable
  if (preview){
    preview.style.cursor = "pointer";
    preview.onclick = () => (location.href = championHref());
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

  // Glow Champion card on Home if generated
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
  champBtn?.addEventListener("click", () => location.href = championHref());
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

/* ===== Rewards Modal (Home) ===== */
(function initRewardsModal(){
  const rewardsBtn = document.getElementById("rewardsBtn");
  const modal = document.getElementById("rewardsModal");
  const closeBtn = document.getElementById("rewardsCloseBtn");
  const grid = document.getElementById("rewardsGrid");

  if (!rewardsBtn || !modal || !closeBtn || !grid) return;

  const REWARD_KEYS = {
    songPng: "mb_png_song",
    moviePng: "mb_png_movie",
    magicPng: "mb_png_magicblock",
  };

  const items = [
    {
      key: "song",
      title: "Quiz 1 — Song",
      sub: "Guess the Song by the Melody",
      doneKey: MB_KEYS.doneSong,
      pngKey: REWARD_KEYS.songPng,
      openHref: "quizzes/song.html"
    },
    {
      key: "movie",
      title: "Quiz 2 — Movie",
      sub: "Guess the Movie by the Frame",
      doneKey: MB_KEYS.doneMovie,
      pngKey: REWARD_KEYS.moviePng,
      openHref: "quizzes/movie.html"
    },
    {
      key: "magicblock",
      title: "Quiz 3 — MagicBlock",
      sub: "How well do you know MagicBlock?",
      doneKey: MB_KEYS.doneMagic,
      pngKey: REWARD_KEYS.magicPng,
      openHref: "quizzes/magicblock.html"
    },
    {
      key: "champion",
      title: "Champion Card",
      sub: "Unlocked after all 3 quizzes",
      doneKey: null,
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

    items.forEach(it => {
      const png = localStorage.getItem(it.pngKey || "");
      const hasPng = !!(png && png.startsWith("data:image/"));
      const done = it.doneKey ? isDoneLocal(it.doneKey) : null;

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
        thumb.textContent = "Not generated";
      }

      const meta = document.createElement("div");
      meta.className = "rewardMeta";

      const t = document.createElement("div");
      t.className = "rewardTitle";
      t.textContent = it.title;

      const s = document.createElement("div");
      s.className = "rewardSub";
      if (it.key === "champion"){
        const allDone = isDoneLocal(MB_KEYS.doneSong) && isDoneLocal(MB_KEYS.doneMovie) && isDoneLocal(MB_KEYS.doneMagic);
        s.textContent = allDone ? (hasPng ? "Ready ✅" : "Unlocked ✅ (generate on Champion page)") : "Locked (complete all quizzes)";
      } else {
        s.textContent = done ? (hasPng ? "Ready ✅" : "Completed ✅ (generate card inside quiz)") : "Not completed";
      }

      const actions = document.createElement("div");
      actions.className = "rewardActions";

      const openBtn = document.createElement("button");
      openBtn.className = "btn";
      openBtn.textContent = it.key === "champion" ? "Open Champion" : (done ? "Open quiz" : "Start");
      openBtn.addEventListener("click", () => (location.href = it.openHref));
      actions.appendChild(openBtn);

      if (hasPng){
        const dl = document.createElement("button");
        dl.className = "btn btn--ghost";
        dl.textContent = "Download PNG";
        dl.addEventListener("click", () => downloadDataUrl(png, filenameFor(it.key)));
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

  function filenameFor(key){
    if (key === "song") return "magicblock-song-result.png";
    if (key === "movie") return "magicblock-movie-result.png";
    if (key === "magicblock") return "magicblock-knowledge-result.png";
    return "magicblock-champion-card.png";
  }

  function downloadDataUrl(dataUrl, filename){
    const a = document.createElement("a");
    a.download = filename;
    a.href = dataUrl;
    a.click();
  }
})();
