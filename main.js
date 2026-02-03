// main.js
document.addEventListener("DOMContentLoaded", () => {
  const doneSong = localStorage.getItem("mb_done_song") === "1";
  const doneMovie = localStorage.getItem("mb_done_movie") === "1";
  const doneMB = localStorage.getItem("mb_done_magicblock") === "1";

  function setDone(cardId, badgeId, isDone) {
    const card = document.getElementById(cardId);
    const badge = document.getElementById(badgeId);
    if (!card || !badge) return;

    if (isDone) {
      card.classList.add("card--done");
      badge.style.display = "inline-flex";
    } else {
      card.classList.remove("card--done");
      badge.style.display = "none";
    }
  }

  setDone("cardSong", "badgeSong", doneSong);
  setDone("cardMovie", "badgeMovie", doneMovie);
  setDone("cardMagic", "badgeMagic", doneMB);

  const allDone = doneSong && doneMovie && doneMB;

  const championBtn = document.getElementById("championBtn");
  const championHint = document.getElementById("championHint");

  if (championBtn && championHint) {
    if (allDone) {
      championBtn.style.display = "inline-flex";
      championHint.textContent = "Champion Card unlocked!";
      // optional glow on show
      championBtn.classList.add("is-pop");
    } else {
      championBtn.style.display = "none";
      championHint.textContent = "Complete all three quizzes to unlock the Champion Card.";
    }
  }

  if (championBtn) {
    championBtn.addEventListener("click", async () => {
      if (typeof window.MB_generateChampionCard === "function") {
        await window.MB_generateChampionCard();
      }
    });
  }
});
