const $ = (id) => document.getElementById(id);

const y = $("year");
if (y) y.textContent = new Date().getFullYear();

/* Autoplay helper (works after first user interaction too) */
function forcePlayAll(selector){
  const videos = document.querySelectorAll(selector);
  if (!videos.length) return;

  const tryPlay = () => videos.forEach(v => v.play().catch(() => {}));
  tryPlay();
  window.addEventListener("click", tryPlay, { once: true });
  window.addEventListener("touchstart", tryPlay, { once: true });
}
forcePlayAll(".bg__video");
forcePlayAll(".brand__logo");
forcePlayAll(".resultLogo");

/* Profile storage */
const PROFILE_NAME_KEY = "mb_profile_name";
const PROFILE_AVATAR_KEY = "mb_profile_avatar"; // dataURL
function getProfile(){
  return {
    name: localStorage.getItem(PROFILE_NAME_KEY) || "",
    avatar: localStorage.getItem(PROFILE_AVATAR_KEY) || ""
  };
}
function setProfile(name, avatar){
  localStorage.setItem(PROFILE_NAME_KEY, name.trim());
  if (avatar) localStorage.setItem(PROFILE_AVATAR_KEY, avatar);
}
function clearAvatar(){
  localStorage.removeItem(PROFILE_AVATAR_KEY);
}

/* Profile UI */
function renderProfile(){
  const { name, avatar } = getProfile();

  const slot = $("profileSlot");
  const nameEl = $("profileName");
  const img = $("profileAvatarImg");
  const fallback = $("profileAvatarFallback");

  if (!slot || !nameEl || !img || !fallback) return;

  if (!name){
    slot.style.display = "none";
    return;
  }

  slot.style.display = "inline-flex";
  nameEl.textContent = name;

  if (avatar){
    img.src = avatar;
    img.style.display = "block";
    fallback.style.display = "none";
  } else {
    img.style.display = "none";
    fallback.style.display = "flex";
    fallback.textContent = (name.slice(0,2) || "MB").toUpperCase();
  }
}

function openGate(prefill = true){
  const gate = $("profileGate");
  if (!gate) return;

  gate.classList.add("is-open");
  gate.setAttribute("aria-hidden", "false");

  const { name, avatar } = getProfile();

  const nameInput = $("gateName");
  const avatarImg = $("gateAvatarImg");
  const avatarText = $("gateAvatarText");

  if (prefill && nameInput) nameInput.value = name || "";

  if (avatar && avatarImg && avatarText){
    avatarImg.src = avatar;
    avatarImg.style.display = "block";
    avatarText.style.display = "none";
  } else if (avatarImg && avatarText){
    avatarImg.style.display = "none";
    avatarText.style.display = "flex";
  }
}

function closeGate(){
  const gate = $("profileGate");
  if (!gate) return;

  gate.classList.remove("is-open");
  gate.setAttribute("aria-hidden", "true");
}

/* Gate wiring */
(function initGate(){
  const gate = $("profileGate");
  if (!gate) return;

  const require = document.body.getAttribute("data-require-profile") === "1";
  const { name } = getProfile();

  // If profile required and missing => open immediately
  if (require && !name) openGate(false);

  const closeBtn = $("gateClose");
  if (closeBtn){
    closeBtn.addEventListener("click", () => {
      const { name: n } = getProfile();
      // If required and missing => don't allow closing
      if (require && !n) return;
      closeGate();
    });
  }

  const avatarInput = $("gateAvatarInput");
  const avatarImg = $("gateAvatarImg");
  const avatarText = $("gateAvatarText");
  if (avatarInput){
    avatarInput.addEventListener("change", () => {
      const file = avatarInput.files && avatarInput.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || "");
        if (avatarImg && avatarText){
          avatarImg.src = dataUrl;
          avatarImg.style.display = "block";
          avatarText.style.display = "none";
        }
        // store immediately (still can change name)
        localStorage.setItem(PROFILE_AVATAR_KEY, dataUrl);
        renderProfile();
      };
      reader.readAsDataURL(file);
    });
  }

  const startBtn = $("gateStart");
  if (startBtn){
    startBtn.addEventListener("click", () => {
      const nameInput = $("gateName");
      const n = (nameInput?.value || "").trim();
      if (!n) return;

      // avatar already stored by upload; keep if exists
      setProfile(n, "");
      renderProfile();
      closeGate();
    });
  }

  const profileSlot = $("profileSlot");
  if (profileSlot){
    profileSlot.addEventListener("click", () => openGate(true));
  }
})();

/* Completed badges + champion unlock */
function isDone(key){
  return localStorage.getItem(key) === "1";
}

function updateBadges(){
  const map = {
    song: "mb_done_song",
    movie: "mb_done_movie",
    magicblock: "mb_done_magicblock",
  };

  let allDone = true;

  Object.entries(map).forEach(([k, storageKey]) => {
    const done = isDone(storageKey);
    if (!done) allDone = false;

    const badge = document.querySelector(`[data-badge="${k}"]`);
    if (badge) badge.style.display = done ? "inline-flex" : "none";

    const card = document.getElementById(`card-${k}`);
    if (card) card.classList.toggle("card--done", done);
  });

  const champ = $("championWrap");
  if (champ) champ.style.display = allDone ? "block" : "none";
}

renderProfile();
updateBadges();
