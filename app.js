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
let helpTimer = null;  // types the answer letter by letter
let helped = false;    // help was used on this question
const HELP_DELAY = 600; // ms between letters

const $ = (id) => document.getElementById(id);

// Lowercase, trim, collapse spaces.
function clean(s) {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

// Remove accents: "è" -> "e".
function stripAccents(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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

function stopHelp() {
  clearInterval(helpTimer);
  helpTimer = null;
  $("help").disabled = waiting;
}

// Type the correct answer into the box, one letter at a time.
// Keeps what the user already typed if it's a correct start of the answer.
function startHelp() {
  if (waiting || helpTimer) return;
  helped = true;
  const answer = current.verb.forms[current.slot];
  const box = $("answer");
  const typed = box.value.toLowerCase();
  const sameStart = stripAccents(answer).startsWith(stripAccents(typed));
  let i = sameStart ? typed.length : 0;
  if (!sameStart) box.value = "";
  $("help").disabled = true;
  box.focus();
  const step = () => {
    if (i >= answer.length) { stopHelp(); $("help").disabled = true; return; }
    box.value = answer.slice(0, i + 1);
    i++;
  };
  step();
  helpTimer = setInterval(step, HELP_DELAY);
}

function nextQuestion() {
  clearTimeout(advanceTimer);
  waiting = false;
  helped = false;
  stopHelp();
  current = pickQuestion();
  if (level === 1) {
    // Italian verb with the English in brackets; inner hint brackets become a dash.
    const en = current.verb.en.replace(/\s*\((.*)\)/, " – $1");
    $("verb").innerHTML = `${current.verb.it} <span class="en">(${en})</span>`;
  } else {
    $("verb").textContent = current.verb.en;
  }
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
  stopHelp();

  const answer = current.verb.forms[current.slot];
  const result = check(input, answer);
  const s = scores[level];
  s.total++;
  waiting = true;
  $("answer").disabled = true;
  $("help").disabled = true;

  const fb = $("feedback");
  if (result === "wrong") {
    fb.className = "feedback wrong";
    fb.innerHTML = `✗ Correct answer: <strong>${answer}</strong>` +
      (level === 2 ? ` <span class="sub">(${current.verb.it})</span>` : "");
    $("submit").textContent = "Next";
    $("submit").focus();
  } else if (helped) {
    // Right, but with help: no point, and wait for Enter like a wrong answer.
    fb.className = "feedback right";
    fb.innerHTML = `✓ <strong>${answer}</strong>, with help (no point)`;
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
  stopHelp();
  showScreen("menu");
  $("menu-score-1").textContent = scores[1].total ? `${scores[1].right} / ${scores[1].total}` : "";
  $("menu-score-2").textContent = scores[2].total ? `${scores[2].right} / ${scores[2].total}` : "";
}

document.addEventListener("DOMContentLoaded", () => {
  $("play1").addEventListener("click", () => startLevel(1));
  $("play2").addEventListener("click", () => startLevel(2));
  $("back").addEventListener("click", (e) => { e.preventDefault(); backToMenu(); });
  $("form").addEventListener("submit", (e) => { e.preventDefault(); submit(); });
  $("help").addEventListener("click", startHelp);
  // Typing while help is running stops it, so you can finish the word yourself.
  $("answer").addEventListener("input", () => { if (helpTimer) { stopHelp(); $("help").disabled = false; } });
  showScreen("menu");
});

// Export for tests (ignored in the browser).
if (typeof module !== "undefined") module.exports = { check, clean, stripAccents, dropPronoun };
