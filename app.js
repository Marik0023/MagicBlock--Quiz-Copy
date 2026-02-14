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
      if (s === "s1") location.href = "seasons/s1/index.html";
      if (s === "s2") location.href = "seasons/s2/index.html";
      if (s === "s3") location.href = "seasons/s3/index.html";
    });
  });
}


function updateSeasonCompletedBadges(){
  const map = {
    s1: { pngKey: "mb_champ_png", readyKey: "mb_champ_ready" },
    s2: { pngKey: "mb_champ_png_s2", readyKey: "mb_champ_ready_s2" },
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

  const CHAMP = {
    s1: { pngKey: "mb_champ_png", openHref: "seasons/s1/champion.html", title: "Season 1 — Champion Card" },
    // reserved for future seasons
    s2: { pngKey: "mb_champ_png_s2", openHref: "seasons/s2/index.html", title: "Season 2 — Champion Card" },
    s3: { pngKey: "mb_champ_png_s3", openHref: "seasons/s3/index.html", title: "Season 3 — Champion Card" },
  };

  function open(){
    render();
    modal.classList.add("isOpen");
  }
  function close(){
    modal.classList.remove("isOpen");
  }

  btn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });

  function render(){
    grid.innerHTML = "";

    ["s1","s2","s3"].forEach((k) => {
      const it = CHAMP[k];
      const png = localStorage.getItem(it.pngKey) || "";
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
        thumb.textContent = (k === "s1") ? "Not generated" : "Coming soon";
      }

      const meta = document.createElement("div");
      meta.className = "rewardMeta";

      const t = document.createElement("div");
      t.className = "rewardTitle";
      t.textContent = it.title;

      const s = document.createElement("div");
      s.className = "rewardSub";
      if (k === "s1") s.textContent = hasPng ? "Ready ✅" : "Complete Season 1 to unlock";
      else s.textContent = "Not available yet";

      const actions = document.createElement("div");
      actions.className = "rewardActions";

      const openBtn = document.createElement("button");
      openBtn.className = "btn";
      openBtn.textContent = (k === "s1") ? "Open" : "Coming soon";
      openBtn.disabled = (k !== "s1");
      openBtn.addEventListener("click", () => {
        if (k !== "s1") return;
        location.href = it.openHref;
      });
      actions.appendChild(openBtn);

      if (hasPng){
        const dl = document.createElement("button");
        dl.className = "btn btn--ghost";
        dl.textContent = "Download";
        dl.addEventListener("click", () => downloadDataUrl(png, `magicblock-${k}-champion-card.png`));
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

  function downloadDataUrl(dataUrl, filename){
    const a = document.createElement("a");
    a.download = filename;
    a.href = dataUrl;
    a.click();
  }
}
