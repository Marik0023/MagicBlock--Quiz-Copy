/* Season 2 — Champion Card
   Fixes:
   - Treat Season 2 as 6 quizzes (60 total), not 3 quizzes (30).
   - Use Season 2 result keys for ALL quizzes.
   - Keep Season 2 champion storage isolated from Season 1.
   - Reduce localStorage pressure (no extra upload preview key).
*/

(function () {
  "use strict";

  const MB_KEYS = {
    // shared
    profile: "mb_profile",

    // done flags (S2)
    doneSong: "mb_s2_done_song",
    doneMovieFrame: "mb_s2_done_movieframe",
    doneMovieEmoji: "mb_s2_done_movieemoji",
    doneTrueFalse: "mb_s2_done_truefalse",
    doneMagic: "mb_s2_done_magicblock",
    doneSilhouette: "mb_s2_done_silhouette",

    // results (S2)
    resSong: "mb_s2_result_song",
    resMovieFrame: "mb_s2_result_movieframe",
    resMovieEmoji: "mb_s2_result_movieemoji",
    resTrueFalse: "mb_s2_result_truefalse",
    resMagic: "mb_s2_result_magicblock",
    resSilhouette: "mb_s2_result_silhouette",

    // champion (S2)
    champId: "mb_s2_champ_id",
    champReady: "mb_s2_champ_ready",
    champPng: "mb_s2_champ_png",
  };

  const QUIZ_COUNT = 6;
  const QUESTIONS_PER_QUIZ = 10;
  const TOTAL_MAX = QUIZ_COUNT * QUESTIONS_PER_QUIZ; // 60

  const els = {
    name: document.getElementById("sumName"),
    done: document.getElementById("sumDone"),
    total: document.getElementById("sumTotal"),
    correct: document.getElementById("sumCorrect"),
    acc: document.getElementById("sumAcc"),
    btnGenerate: document.getElementById("btnGenerate"),
    btnBack: document.getElementById("btnBack"),
    btnBack2: document.getElementById("btnBack2"),
    previewWrap: document.getElementById("previewWrap"),
    previewImg: document.getElementById("previewImg"),
    btnDownload: document.getElementById("btnDownload"),
    lockHint: document.getElementById("lockHint"),
  };

  function safeJsonParse(str, fallback = null) {
    if (!str) return fallback;
    try {
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  }

  function getProfile() {
    return safeJsonParse(localStorage.getItem(MB_KEYS.profile), null);
  }

  function getDoneFlags() {
    const keys = [
      MB_KEYS.doneSong,
      MB_KEYS.doneMovieFrame,
      MB_KEYS.doneMovieEmoji,
      MB_KEYS.doneTrueFalse,
      MB_KEYS.doneMagic,
      MB_KEYS.doneSilhouette,
    ];
    const flags = keys.map((k) => localStorage.getItem(k) === "1");
    return { keys, flags, doneCount: flags.filter(Boolean).length };
  }

  function getResults() {
    const keys = [
      MB_KEYS.resSong,
      MB_KEYS.resMovieFrame,
      MB_KEYS.resMovieEmoji,
      MB_KEYS.resTrueFalse,
      MB_KEYS.resMagic,
      MB_KEYS.resSilhouette,
    ];
    const vals = keys.map((k) => {
      const v = Number(localStorage.getItem(k));
      return Number.isFinite(v) ? v : 0;
    });
    return { keys, vals, correctAll: vals.reduce((a, b) => a + b, 0) };
  }

  function computeSummary() {
    const profile = getProfile();
    const { doneCount } = getDoneFlags();
    const { correctAll } = getResults();
    const accuracy = TOTAL_MAX > 0 ? Math.round((correctAll / TOTAL_MAX) * 100) : 0;

    return {
      profile,
      doneCount,
      correctAll,
      accuracy,
      unlocked: !!profile && doneCount === QUIZ_COUNT,
    };
  }

  function ensureChampionId() {
    let id = localStorage.getItem(MB_KEYS.champId);
    if (id) return id;
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let tail = "";
    for (let i = 0; i < 6; i++) tail += chars[Math.floor(Math.random() * chars.length)];
    id = `MB-CHAMP-S2-${tail}`;
    try {
      localStorage.setItem(MB_KEYS.champId, id);
    } catch {
      // non-fatal
    }
    return id;
  }

  function getTier(correctAll) {
    // Scale Season 1 thresholds (25/30 ~ 83%, 18/30 ~ 60%) to Season 2 (60 max)
    if (correctAll >= 50) return "GOLD"; // ~83%
    if (correctAll >= 36) return "SILVER"; // ~60%
    return "BRONZE";
  }

  function dataUrlToBlob(dataUrl) {
    const [meta, b64] = dataUrl.split(",");
    const mime = (meta.match(/data:([^;]+)/) || [])[1] || "image/png";
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return new Blob([u8], { type: mime });
  }

  function tryPersistChampionPng(pngDataUrl) {
    // Best effort: store the preview. If quota is exceeded, evict the heaviest quiz PNG caches.
    const evictKeys = [];
    try {
      // Remove cached quiz cards first (these are the biggest keys).
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (k.startsWith("mb_s2_png_") || k.startsWith("mb_png_")) evictKeys.push(k);
      }
    } catch {
      // ignore
    }

    // 1) Attempt straight save
    try {
      localStorage.setItem(MB_KEYS.champPng, pngDataUrl);
      localStorage.setItem(MB_KEYS.champReady, "1");
      return true;
    } catch {
      // 2) Evict heavy keys and retry
      try {
        evictKeys.forEach((k) => {
          try {
            localStorage.removeItem(k);
          } catch {}
        });
      } catch {}

      try {
        localStorage.setItem(MB_KEYS.champPng, pngDataUrl);
        localStorage.setItem(MB_KEYS.champReady, "1");
        return true;
      } catch {
        // 3) Give up persisting preview; still allow download & leaderboard sync.
        try {
          localStorage.setItem(MB_KEYS.champReady, "1");
        } catch {}
        alert("Storage is full. The preview couldn't be saved, but you can still download the card.");
        return false;
      }
    }
  }

  async function renderPreviewAndSync(summary, pngDataUrl) {
    // UI preview
    if (els.previewImg) els.previewImg.src = pngDataUrl;
    if (els.previewWrap) els.previewWrap.style.display = "block";
    if (els.btnDownload) {
      els.btnDownload.disabled = false;
      els.btnDownload.onclick = () => {
        const blob = dataUrlToBlob(pngDataUrl);
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "Season2-Champion-Card.png";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1500);
      };
    }

    // Persist preview (best effort)
    tryPersistChampionPng(pngDataUrl);

    // Leaderboard sync (uploads champion to Supabase + updates score)
    try {
      if (window.MBQ_LEADERBOARD && typeof window.MBQ_LEADERBOARD.syncFromLocal === "function") {
        await window.MBQ_LEADERBOARD.syncFromLocal("s2", pngDataUrl);
      }
    } catch (e) {
      console.warn("Leaderboard sync failed", e);
      // Non-fatal: user still has card.
    }
  }

  function buildCardPng(summary) {
    const profile = summary.profile;
    const champId = ensureChampionId();
    const tier = getTier(summary.correctAll);

    const W = 1000;
    const H = 560;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#202125");
    grad.addColorStop(1, "#2a2b31");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Card
    const pad = 40;
    const r = 36;
    const x = pad;
    const y = pad;
    const w = W - pad * 2;
    const h = H - pad * 2;

    ctx.save();
    roundRect(ctx, x, y, w, h, r);
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.fill();
    ctx.restore();

    // Header
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "700 42px system-ui, -apple-system, Segoe UI, Roboto";
    ctx.fillText("Champion Card", x + 220, y + 88);

    // Tier badge
    ctx.save();
    ctx.font = "700 18px system-ui, -apple-system, Segoe UI, Roboto";
    const badgeText = tier;
    const bw = ctx.measureText(badgeText).width + 38;
    const bh = 34;
    const bx = x + w - bw - 30;
    const by = y + 30;
    roundRect(ctx, bx, by, bw, bh, 16);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillText(badgeText, bx + 19, by + 23);
    ctx.restore();

    // Avatar
    const avSize = 210;
    const avX = x + 60;
    const avY = y + 140;
    ctx.save();
    roundRect(ctx, avX, avY, avSize, avSize, 38);
    ctx.clip();
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(avX, avY, avSize, avSize);
    ctx.restore();

    // Text blocks
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = "600 16px system-ui, -apple-system, Segoe UI, Roboto";
    ctx.fillText("Your Name", x + 320, y + 165);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "800 54px system-ui, -apple-system, Segoe UI, Roboto";
    ctx.fillText(profile?.name || "Player", x + 318, y + 230);

    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = "600 16px system-ui, -apple-system, Segoe UI, Roboto";
    ctx.fillText("Total Score", x + 320, y + 280);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "900 46px system-ui, -apple-system, Segoe UI, Roboto";
    ctx.fillText(`${summary.correctAll} / ${TOTAL_MAX}`, x + 318, y + 340);

    // ID pill
    ctx.save();
    ctx.font = "700 16px system-ui, -apple-system, Segoe UI, Roboto";
    const idW = ctx.measureText(champId).width + 44;
    const idH = 36;
    const idX = x + 318;
    const idY = y + 365;
    roundRect(ctx, idX, idY, idW, idH, 16);
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(champId, idX + 22, idY + 24);
    ctx.restore();

    // Accuracy footer
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "600 16px system-ui, -apple-system, Segoe UI, Roboto";
    ctx.fillText(`Accuracy: ${summary.accuracy}%`, x + 60, y + h - 40);

    // Avatar image (async): draw after load
    return new Promise((resolve) => {
      const av = profile?.avatar;
      if (!av) {
        resolve(canvas.toDataURL("image/png"));
        return;
      }
      const img = new Image();
      img.onload = () => {
        ctx.save();
        roundRect(ctx, avX, avY, avSize, avSize, 38);
        ctx.clip();
        // cover
        const scale = Math.max(avSize / img.width, avSize / img.height);
        const dw = img.width * scale;
        const dh = img.height * scale;
        const dx = avX + (avSize - dw) / 2;
        const dy = avY + (avSize - dh) / 2;
        ctx.drawImage(img, dx, dy, dw, dh);
        ctx.restore();
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => resolve(canvas.toDataURL("image/png"));
      img.src = av;
    });
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

  function restoreSavedPreviewIfAny() {
    const png = localStorage.getItem(MB_KEYS.champPng);
    if (!png) return;
    if (els.previewImg) els.previewImg.src = png;
    if (els.previewWrap) els.previewWrap.style.display = "block";
    if (els.btnDownload) {
      els.btnDownload.disabled = false;
      els.btnDownload.onclick = () => {
        const blob = dataUrlToBlob(png);
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "Season2-Champion-Card.png";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1500);
      };
    }
  }

  async function init() {
    const summary = computeSummary();

    if (els.name) els.name.textContent = summary.profile?.name || "—";
    if (els.done) els.done.textContent = `${summary.doneCount} / ${QUIZ_COUNT}`;
    if (els.total) els.total.textContent = String(TOTAL_MAX);
    if (els.correct) els.correct.textContent = String(summary.correctAll);
    if (els.acc) els.acc.textContent = `${summary.accuracy}%`;

    if (els.btnGenerate) {
      els.btnGenerate.disabled = !summary.unlocked;
      els.btnGenerate.addEventListener("click", async () => {
        const s = computeSummary();
        if (!s.unlocked) return;

        els.btnGenerate.disabled = true;
        els.btnGenerate.textContent = "Generating...";
        try {
          const pngDataUrl = await buildCardPng(s);
          await renderPreviewAndSync(s, pngDataUrl);
          els.btnGenerate.textContent = "Regenerate Champion Card";
        } catch (e) {
          console.error(e);
          alert("Failed to generate Champion Card. Please try again.");
          els.btnGenerate.textContent = "Generate Champion Card";
        } finally {
          els.btnGenerate.disabled = false;
        }
      });
    }

    const back = () => (window.location.href = "index.html");
    if (els.btnBack) els.btnBack.addEventListener("click", back);
    if (els.btnBack2) els.btnBack2.addEventListener("click", back);

    if (els.lockHint) {
      els.lockHint.style.display = summary.unlocked ? "none" : "block";
    }

    restoreSavedPreviewIfAny();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
