// app.js
(() => {
  const PROFILE_NAME_KEY = "mb_profile_name";
  const PROFILE_AVATAR_KEY = "mb_profile_avatar";
  const RETURN_TO_KEY = "mb_return_to";

  function qs(sel, root = document) { return root.querySelector(sel); }

  function getProfile() {
    return {
      name: (localStorage.getItem(PROFILE_NAME_KEY) || "").trim(),
      avatar: localStorage.getItem(PROFILE_AVATAR_KEY) || ""
    };
  }

  function setProfile({ name, avatar }) {
    localStorage.setItem(PROFILE_NAME_KEY, (name || "").trim());
    if (avatar) localStorage.setItem(PROFILE_AVATAR_KEY, avatar);
  }

  function initials(name) {
    const n = (name || "").trim();
    if (!n) return "MB";
    const parts = n.split(/\s+/).slice(0, 2);
    return parts.map(p => p[0]?.toUpperCase() || "").join("") || "MB";
  }

  // ---------- Autoplay helper (restored) ----------
  function forcePlayAll(selector){
    const videos = document.querySelectorAll(selector);
    if (!videos.length) return;

    const tryPlay = () => videos.forEach(v => v.play().catch(() => {}));
    tryPlay();
    window.addEventListener("click", tryPlay, { once: true });
    window.addEventListener("touchstart", tryPlay, { once: true });
  }

  // ---------- Header profile render ----------
  function renderHeaderProfile() {
    const slot = qs("#profileSlot");
    if (!slot) return;

    const { name, avatar } = getProfile();

    if (!name) {
      slot.style.display = "none";
      return;
    }

    slot.style.display = "inline-flex";

    const nameEl = qs("#profileName");
    const imgEl = qs("#profileAvatarImg");
    const fallbackEl = qs("#profileAvatarFallback");

    if (nameEl) nameEl.textContent = name;

    if (avatar) {
      if (imgEl) {
        imgEl.src = avatar;
        imgEl.style.display = "block";
      }
      if (fallbackEl) fallbackEl.style.display = "none";
    } else {
      if (imgEl) imgEl.style.display = "none";
      if (fallbackEl) {
        fallbackEl.textContent = initials(name);
        fallbackEl.style.display = "flex";
      }
    }
  }

  // ---------- Profile Gate ----------
  function ensureGate() {
    let gate = qs("#profileGate");
    if (gate) return gate;

    gate = document.createElement("div");
    gate.id = "profileGate";
    gate.className = "gate";
    gate.setAttribute("aria-hidden", "true");

    gate.innerHTML = `
      <div class="gate__card" role="dialog" aria-modal="true" aria-label="Create your profile">
        <div class="gate__top">
          <div>
            <div class="gate__title">Create your profile</div>
            <div class="gate__sub">This will appear on your result cards.</div>
          </div>
          <button class="gate__close" id="gateClose" type="button" aria-label="Close">✕</button>
        </div>

        <div class="gate__content">
          <label class="gate__avatarBox" for="gateAvatar">
            <input id="gateAvatar" type="file" accept="image/*" />
            <img id="gateAvatarPreview" alt="" />
            <div class="gate__avatarText" id="gateAvatarText">Upload Avatar</div>
          </label>

          <div class="gate__right">
            <input id="gateName" class="gate__name" type="text" placeholder="Enter your name" maxlength="24" />
            <div class="gate__hint">Tip: you can click your profile later to change it.</div>

            <div class="gate__actions">
              <button id="gateStart" class="btn btn--next gate__start" type="button" disabled>Start</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(gate);
    return gate;
  }

  function openGate({ force = false } = {}) {
    const gate = ensureGate();
    const closeBtn = qs("#gateClose", gate);

    const profile = getProfile();
    const mustSetup = !profile.name;

    if (closeBtn) closeBtn.style.display = (mustSetup || force) ? "none" : "inline-flex";

    const nameInput = qs("#gateName", gate);
    const preview = qs("#gateAvatarPreview", gate);
    const text = qs("#gateAvatarText", gate);
    const startBtn = qs("#gateStart", gate);

    if (nameInput) nameInput.value = profile.name || "";
    if (preview && profile.avatar) {
      preview.src = profile.avatar;
      preview.style.display = "block";
      if (text) text.style.display = "none";
    } else {
      if (preview) preview.style.display = "none";
      if (text) text.style.display = "flex";
    }

    if (startBtn) startBtn.disabled = !(nameInput && nameInput.value.trim().length > 0);

    gate.classList.add("is-open");
    gate.setAttribute("aria-hidden", "false");

    if (nameInput) nameInput.focus();
  }

  function closeGate() {
    const gate = qs("#profileGate");
    if (!gate) return;
    gate.classList.remove("is-open");
    gate.setAttribute("aria-hidden", "true");
  }

  function bindGateEvents() {
    const gate = ensureGate();
    const avatarInput = qs("#gateAvatar", gate);
    const preview = qs("#gateAvatarPreview", gate);
    const text = qs("#gateAvatarText", gate);
    const nameInput = qs("#gateName", gate);
    const startBtn = qs("#gateStart", gate);
    const closeBtn = qs("#gateClose", gate);

    let tempAvatar = getProfile().avatar || "";

    if (avatarInput) {
      avatarInput.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
          tempAvatar = String(reader.result);
          if (preview) {
            preview.src = tempAvatar;
            preview.style.display = "block";
          }
          if (text) text.style.display = "none";
        };
        reader.readAsDataURL(file);
      });
    }

    if (nameInput && startBtn) {
      nameInput.addEventListener("input", () => {
        startBtn.disabled = !(nameInput.value.trim().length > 0);
      });
    }

    if (startBtn) {
      startBtn.addEventListener("click", () => {
        const name = (nameInput?.value || "").trim();
        if (!name) return;

        setProfile({ name, avatar: tempAvatar });
        renderHeaderProfile();
        closeGate();

        const returnTo = sessionStorage.getItem(RETURN_TO_KEY) || "";
        if (returnTo) {
          sessionStorage.removeItem(RETURN_TO_KEY);
          location.href = returnTo;
        }
      });
    }

    if (closeBtn) closeBtn.addEventListener("click", closeGate);

    gate.addEventListener("click", (e) => {
      if (e.target !== gate) return;
      const p = getProfile();
      if (p.name) closeGate();
    });
  }

  // ---------- Require profile on quiz pages ----------
  function enforceProfileIfNeeded() {
    const require = document.body?.dataset?.requireProfile === "1";
    if (!require) return;

    const p = getProfile();
    if (p.name) return;

    sessionStorage.setItem(RETURN_TO_KEY, location.href);
    const indexUrl = new URL("../index.html?setup=1", location.href).href;
    location.href = indexUrl;
  }

  // ---------- Card generation (basic v1) ----------
  function loadImage(src) {
    return new Promise((resolve) => {
      if (!src) return resolve(null);
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  function downloadDataUrl(dataUrl, filename) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  async function generateCard({ title, subtitle, filename = "card.png" }) {
    const { name, avatar } = getProfile();

    const W = 1200;
    const H = 675;

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#07070a";
    ctx.fillRect(0, 0, W, H);

    ctx.globalAlpha = 0.18;
    for (let x = -H; x < W; x += 28) {
      ctx.fillStyle = x % 56 === 0 ? "#ffffff" : "#bfbfbf";
      ctx.fillRect(x, 0, 10, H);
    }
    ctx.globalAlpha = 1;

    const g = ctx.createRadialGradient(W * 0.3, H * 0.35, 80, W * 0.3, H * 0.35, 800);
    g.addColorStop(0, "rgba(255,255,255,0.10)");
    g.addColorStop(1, "rgba(0,0,0,0.85)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "rgba(0,0,0,0.35)";
    roundRect(ctx, 70, 70, W - 140, H - 140, 44);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 2;
    roundRect(ctx, 70, 70, W - 140, H - 140, 44);
    ctx.stroke();

    const AV = 140;
    const ax = 110;
    const ay = 170;

    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.beginPath();
    ctx.arc(ax + AV / 2, ay + AV / 2, AV / 2 + 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(ax + AV / 2, ay + AV / 2, AV / 2, 0, Math.PI * 2);
    ctx.clip();

    const img = await loadImage(avatar);
    if (img) {
      const r = Math.max(AV / img.width, AV / img.height);
      const nw = img.width * r;
      const nh = img.height * r;
      const nx = ax + (AV - nw) / 2;
      const ny = ay + (AV - nh) / 2;
      ctx.drawImage(img, nx, ny, nw, nh);
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.10)";
      ctx.fillRect(ax, ay, AV, AV);
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.font = "900 56px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(initials(name), ax + AV / 2, ay + AV / 2 + 2);
    }
    ctx.restore();

    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "900 54px Inter, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(title, 290, 170);

    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.font = "700 22px Inter, system-ui, sans-serif";
    ctx.fillText(subtitle, 290, 240);

    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "800 32px Inter, system-ui, sans-serif";
    ctx.fillText(name || "Player", 290, 320);

    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "700 18px Inter, system-ui, sans-serif";
    ctx.fillText("MagicBlock Quiz", 290, 366);

    const dataUrl = canvas.toDataURL("image/png");
    downloadDataUrl(dataUrl, filename);
  }

  // Public helpers
  window.MB_openProfileGate = () => openGate({ force: false });
  window.MB_generateQuizCard = async ({ quizTitle, scoreText }) => {
    await generateCard({
      title: quizTitle,
      subtitle: scoreText,
      filename: "magicblock-quiz-card.png"
    });
  };
  window.MB_generateChampionCard = async () => {
    await generateCard({
      title: "Champion",
      subtitle: "Completed all 3 quizzes",
      filename: "magicblock-champion-card.png"
    });
  };

  document.addEventListener("DOMContentLoaded", () => {
    enforceProfileIfNeeded();
    bindGateEvents();
    renderHeaderProfile();

    // Restore autoplay behavior
    forcePlayAll(".bg__video");
    forcePlayAll(".brand__logo");

    // clicking profile opens gate
    const slot = qs("#profileSlot");
    if (slot) slot.addEventListener("click", () => openGate({ force: false }));

    // index: open gate if setup required
    const url = new URL(location.href);
    const wantSetup = url.searchParams.get("setup") === "1";
    const p = getProfile();
    const isIndex = location.pathname.endsWith("/index.html") || location.pathname === "/" || location.pathname.endsWith("/");
    if (!p.name && (wantSetup || isIndex)) openGate({ force: true });
  });
})();
