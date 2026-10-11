// Pronoun slots match the order of forms in verbs.js.
// Slot 2 shows "lui" or "lei" at random (same form).
const PRONOUNS = [["io"], ["tu"], ["lui", "lei"], ["noi"], ["voi"], ["loro"]];
const ALL_PRONOUNS = ["io", "tu", "lui", "lei", "noi", "voi", "loro"];

// Scores live in memory only: a refresh starts a new session.
const scores = { 1: { right: 0, total: 0 }, 2: { right: 0, total: 0 } };

let level = null;
let current = null;   // { verb, slot, pronoun }
let lastKey = null;   // avoid repeating the same question twice in a row
let waiting = false;  // true while feedback is shown
let advanceTimer = null;

const $ = (id) => document.getElementById(id);

// Lowercase, trim, collapse spaces.
function clean(s) {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

// Remove accents: "è" -> "e".
function stripAccents(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Drop a leading pronoun if the user typed one ("noi parliamo" -> "parliamo").
function dropPronoun(s) {
  const parts = s.split(" ");
  if (parts.length > 1 && ALL_PRONOUNS.includes(parts[0])) {
    return parts.slice(1).join(" ");
  }
  return s;
}

// Returns "exact", "accent" (right except accents) or "wrong".
function check(input, answer) {
  const typed = dropPronoun(clean(input));
  const correct = clean(answer);
  if (typed === correct) return "exact";
  if (stripAccents(typed) === stripAccents(correct)) return "accent";
  return "wrong";
}

function pickQuestion() {
  let verb, slot, key;
  do {
    verb = VERBS[Math.floor(Math.random() * VERBS.length)];
    slot = Math.floor(Math.random() * 6);
    key = verb.it + slot;
  } while (key === lastKey && VERBS.length * 6 > 1);
  lastKey = key;
  const options = PRONOUNS[slot];
  const pronoun = options[Math.floor(Math.random() * options.length)];
  return { verb, slot, pronoun };
}

function showScreen(name) {
  $("menu").hidden = name !== "menu";
  $("game").hidden = name !== "game";
}

function renderScore() {
  const s = scores[level];
  $("score").textContent = `${s.right} / ${s.total}`;
}

function nextQuestion() {
  clearTimeout(advanceTimer);
  waiting = false;
  current = pickQuestion();
  const shown = level === 1 ? current.verb.it : current.verb.en;
  $("verb").textContent = shown;
  $("pronoun").textContent = current.pronoun;
  $("answer").value = "";
  $("answer").disabled = false;
  $("feedback").textContent = "";
  $("feedback").className = "feedback";
  $("submit").textContent = "Check";
  $("answer").focus();
}

function submit() {
  if (waiting) {
    nextQuestion();
    return;
  }
  const input = $("answer").value;
  if (!input.trim()) return;

  const answer = current.verb.forms[current.slot];
  const result = check(input, answer);
  const s = scores[level];
  s.total++;
  waiting = true;
  $("answer").disabled = true;

  const fb = $("feedback");
  if (result === "wrong") {
    fb.className = "feedback wrong";
    fb.innerHTML = `✗ Correct answer: <strong>${answer}</strong>` +
      (level === 2 ? ` <span class="sub">(${current.verb.it})</span>` : "");
    $("submit").textContent = "Next";
    $("submit").focus();
  } else {
    s.right++;
    fb.className = "feedback right";
    if (result === "accent") {
      fb.innerHTML = `✓ Correct, spelled <strong>${answer}</strong>`;
      advanceTimer = setTimeout(nextQuestion, 2000);
    } else {
      fb.textContent = "✓ Correct";
      advanceTimer = setTimeout(nextQuestion, 1000);
    }
    $("submit").textContent = "Next";
    $("submit").focus();
  }
  renderScore();
}

function startLevel(n) {
  level = n;
  lastKey = null;
  $("level-title").textContent = n === 1 ? "Level 1 · Italian → conjugate" : "Level 2 · English → Italian";
  showScreen("game");
  renderScore();
  nextQuestion();
}

function backToMenu() {
  clearTimeout(advanceTimer);
  showScreen("menu");
  $("menu-score-1").textContent = scores[1].total ? `${scores[1].right} / ${scores[1].total}` : "";
  $("menu-score-2").textContent = scores[2].total ? `${scores[2].right} / ${scores[2].total}` : "";
}

document.addEventListener("DOMContentLoaded", () => {
  $("play1").addEventListener("click", () => startLevel(1));
  $("play2").addEventListener("click", () => startLevel(2));
  $("back").addEventListener("click", (e) => { e.preventDefault(); backToMenu(); });
  $("form").addEventListener("submit", (e) => { e.preventDefault(); submit(); });
  showScreen("menu");
});

// Export for tests (ignored in the browser).
if (typeof module !== "undefined") module.exports = { check, clean, stripAccents, dropPronoun };
