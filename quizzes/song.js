// Quiz 1 — Guess the Song by the Melody (A/B/C/D)

const letters = ["A", "B", "C", "D"];

const questions = [
  // TODO: replace with your real data
  {
    src: "../assets/audio/clip1.mp3",
    choices: ["Song 1", "Song 2", "Song 3", "Song 4"],
    correctIndex: 0
  },
  {
    src: "../assets/audio/clip2.mp3",
    choices: ["Song A", "Song B", "Song C", "Song D"],
    correctIndex: 2
  }
];

let idx = 0;
let correct = 0;
let total = 0;

const audio = document.getElementById("audio");
const choicesEl = document.getElementById("choices");
const statusEl = document.getElementById("status");
const nextBtn = document.getElementById("next");

function render(){
  const q = questions[idx];

  audio.src = q.src;
  audio.load();

  choicesEl.innerHTML = "";
  nextBtn.style.display = "none";

  statusEl.textContent = `Score: ${correct} / ${total}`;

  q.choices.forEach((text, i) => {
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.type = "button";
    btn.style.justifyContent = "flex-start";
    btn.textContent = `${letters[i]}) ${text}`;
    btn.addEventListener("click", () => pick(i));
    choicesEl.appendChild(btn);
  });
}

function pick(choiceIndex){
  const q = questions[idx];
  total += 1;

  // lock buttons
  [...choicesEl.querySelectorAll("button")].forEach(b => b.disabled = true);

  const ok = choiceIndex === q.correctIndex;
  if (ok) correct += 1;

  statusEl.textContent = ok
    ? `✅ Correct! Score: ${correct} / ${total}`
    : `❌ Wrong. Score: ${correct} / ${total}`;

  nextBtn.style.display = "inline-flex";
  nextBtn.textContent = (idx === questions.length - 1) ? "Finish" : "Next";
}

function next(){
  if (idx < questions.length - 1){
    idx += 1;
    render();
  } else {
    // finish
    choicesEl.innerHTML = "";
    nextBtn.style.display = "none";
    statusEl.textContent = `Done! Final score: ${correct} / ${total}`;
  }
}

nextBtn.addEventListener("click", next);
render();

