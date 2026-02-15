const MB_KEYS = {
  profile: "mb_profile",
  champPng: "mb_champ_png",
  champReady: "mb_champ_ready",
};

function safeJSONParse(v, fallback = null){
  try { return JSON.parse(v); } catch { return fallback; }
}

function getProfile(){
  return safeJSONParse(localStorage.getItem(MB_KEYS.profile), null);
}

/**
 * If storage full -> clear champion PNG and retry later
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

const PLACEHOLDER_AVATAR = "assets/uploadavatar.jpg";

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


function initSeasonButtons(){
  document.querySelectorAll("[data-season]").forEach(btn => {
    btn.addEventListener("click", () => {
      const s = btn.getAttribute("data-season");
      if (!s) return;

      if (s === "s1") return (location.href = "seasons/s1/index.html");
      if (s === "s2") return (location.href = "seasons/s2/index.html");
      // s3 stays disabled for now
    });
  });
}


function updateSeasonCompletedBadges(){
  const map = {
    s1: { pngKey: "mb_champ_png", readyKey: "mb_champ_ready" },
    s2: { pngKey: "mb_s2_champ_png", readyKey: "mb_s2_champ_ready" },
    s3: { pngKey: "mb_champ_png_s3", readyKey: "mb_champ_ready_s3" },
  };

  Object.entries(map).forEach(([sid, keys]) => {
    const badge = document.querySelector(`[data-season-badge="${sid}"]`);
    if (!badge) return;

    const png = localStorage.getItem(keys.pngKey);
    const ready = localStorage.getItem(keys.readyKey);

    const done = (png && png.startsWith("data:image/")) || ready === "1";
    badge.style.display = done ? "inline-flex" : "none";
  });
/* =========================
   Season progress (ROOT)
========================= */
function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
function getProgNum10(key){
  const n = Number(localStorage.getItem(key) || "0");
  if (!Number.isFinite(n)) return 0;
  return clamp(n, 0, 10);
}
// In quizzes, progress is stored as "next question number" (Q1 answered => nextQ=2)
function answeredCountFromProg(key){
  const nextQ = getProgNum10(key);
  return clamp(nextQ - 1, 0, 10);
}

const SEASON_DEFS = {
  s1: {
    active: true,
    openHref: "seasons/s1/index.html",
    quizzes: [
      { doneKey: "mb_done_song",        progKey: "mb_prog_song" },
      { doneKey: "mb_done_movie",       progKey: "mb_prog_movie" },
      { doneKey: "mb_done_magicblock",  progKey: "mb_prog_magicblock" },
    ],
  },
  s2: {
    active: true,
    openHref: "seasons/s2/index.html",
    quizzes: [
      { doneKey: "mb_s2_done_movieframe",  progKey: "mb_s2_prog_movieframe" },
      { doneKey: "mb_s2_done_movieemoji",  progKey: "mb_s2_prog_movieemoji" },
      { doneKey: "mb_s2_done_song",        progKey: "mb_s2_prog_song" },
      { doneKey: "mb_s2_done_truefalse",   progKey: "mb_s2_prog_truefalse" },
      { doneKey: "mb_s2_done_silhouette",  progKey: "mb_s2_prog_silhouette" },
      { doneKey: "mb_s2_done_magicblock",  progKey: "mb_s2_prog_magicblock" },
    ],
  },
  s3: {
    active: false,
    openHref: "seasons/s3/index.html",
    quizzes: [],
  }
};

function seasonProgressPct(seasonId){
  const def = SEASON_DEFS[seasonId];
  if (!def || !def.quizzes.length) return 0;

  let answered = 0;
  const total = def.quizzes.length * 10;

  for (const q of def.quizzes){
    const done = localStorage.getItem(q.doneKey) === "1";
    if (done) answered += 10;
    else answered += answeredCountFromProg(q.progKey);
  }

  return Math.round((answered / total) * 100);
}

function seasonHasAnyProgress(seasonId){
  const def = SEASON_DEFS[seasonId];
  if (!def) return false;
  for (const q of def.quizzes){
    if (localStorage.getItem(q.doneKey) === "1") return true;
    if (answeredCountFromProg(q.progKey) > 0) return true;
  }
  return false;
}

function applySeasonProgressUI(){
  ["s1","s2","s3"].forEach(seasonId => {
    const pct = seasonProgressPct(seasonId);
    const fill = document.querySelector(`[data-season-progress="${seasonId}"]`);
    const label = document.querySelector(`[data-season-progress-label="${seasonId}"]`);
    if (fill) fill.style.width = `${pct}%`;
    if (label) label.textContent = `${pct}%`;
  });

  // Update Season 2 CTA: Start -> Continue when user answered at least 1 question
  const s2Btn = document.querySelector('[data-season="s2"]');
  if (s2Btn){
    if (!SEASON_DEFS.s2.active){
      s2Btn.textContent = "Coming soon";
      s2Btn.disabled = true;
    } else {
      const hasProg = seasonHasAnyProgress("s2");
      s2Btn.textContent = hasProg ? "Continue" : "Start";
    }
  }
}

}


document.addEventListener("DOMContentLoaded", () => {
  forcePlayAll(".bg__video");
  forcePlayAll(".brand__logo");

  renderTopProfile();
  initProfileModal();
  initSeasonButtons();

  // Achievements on Season picker: show ONLY Champion cards per season
  initAchievementsModal();

  
  updateSeasonCompletedBadges();
  applySeasonProgressUI();
const pill = document.getElementById("profilePill");
  if (pill) pill.addEventListener("click", () => openProfileModal(false));

  const mustCreate = document.body.getAttribute("data-require-profile") === "1";
  if (mustCreate && !getProfile()){
    openProfileModal(true);
  }
});

/* =========================
   Achievements modal (ROOT)
   - Only Champion cards (S1 ready if generated)
   - S2/S3 placeholders for now
========================= */
function initAchievementsModal(){
  const btn = document.getElementById("achievementsBtn");
  const modal = document.getElementById("rewardsModal");
  const closeBtn = document.getElementById("rewardsCloseBtn");
  const grid = document.getElementById("rewardsGrid");

  if (!btn || !modal || !closeBtn || !grid) return;

  const SEASONS = [
    { id:"s1", title:"Season 1 — Champion Card", subLocked:"Complete Season 1 to unlock", pngKey:"mb_champ_png",  readyKey:"mb_champ_ready",  openHref:"seasons/s1/index.html#achievements", active:true },
    { id:"s2", title:"Season 2 — Champion Card", subLocked:"Complete Season 2 to unlock", pngKey:"mb_s2_champ_png", readyKey:"mb_s2_champ_ready", openHref:"seasons/s2/index.html#achievements", active:true },
    { id:"s3", title:"Season 3 — Champion Card", subLocked:"Not available yet",          pngKey:"mb_champ_png_s3", readyKey:"mb_champ_ready_s3", openHref:"#", active:false },
  ];

  function open(){ render(); modal.classList.add("isOpen"); }
  function close(){ modal.classList.remove("isOpen"); }

  btn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });

  function render(){
    grid.innerHTML = "";

    SEASONS.forEach((it) => {
      const png = localStorage.getItem(it.pngKey) || "";
      const ready = localStorage.getItem(it.readyKey) === "1";
      const hasPng = png.startsWith("data:image/");

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
        thumb.textContent = it.active ? "Not generated" : "Coming soon";
      }

      const meta = document.createElement("div");
      meta.className = "rewardMeta";

      const t = document.createElement("div");
      t.className = "rewardTitle";
      t.textContent = it.title;

      const s = document.createElement("div");
      s.className = "rewardSub";
      if (!it.active) s.textContent = "Not available yet";
      else s.textContent = (hasPng || ready) ? "Ready ✅" : it.subLocked;

      const pct = seasonProgressPct(it.id);
      const prog = document.createElement("div");
      prog.className = "miniProg";
      prog.innerHTML = `
        <div class="miniProg__bar"><div class="miniProg__fill" style="width:${pct}%"></div></div>
        <div class="miniProg__text">${pct}%</div>
      `;

      const actions = document.createElement("div");
      actions.className = "rewardActions";

      const openBtn = document.createElement("button");
      openBtn.className = "btn";
      if (!it.active){
        openBtn.textContent = "Coming soon";
        openBtn.disabled = true;
      } else {
        const hasProg = seasonHasAnyProgress(it.id);
        openBtn.textContent = hasProg ? "Continue" : "Start";
        if (it.id === "s1") openBtn.textContent = "Open";
      }

      openBtn.addEventListener("click", () => {
        if (!it.active) return;
        location.href = it.openHref;
      });
      actions.appendChild(openBtn);

      if (hasPng){
        const dl = document.createElement("button");
        dl.className = "btn btn--ghost";
        dl.textContent = "Download";
        dl.addEventListener("click", () => downloadDataUrl(png, `magicblock-${it.id}-champion-card.png`));
        actions.appendChild(dl);
      }

      meta.appendChild(t);
      meta.appendChild(s);
      meta.appendChild(prog);
      meta.appendChild(actions);

      card.appendChild(thumb);
      card.appendChild(meta);
      grid.appendChild(card);
    });
  }

  function downloadDataUrl(dataUrl, filename){
    const a = document.createElement("a");
    a.download = filename;
    a.href = dataUrl;
    a.click();
  }
}
