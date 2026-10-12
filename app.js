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
let helped = false;    // help was used on this question
let streak = 0;        // correct answers in a row (no help) in the current level

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
  $("streak").textContent = `· streak ${streak}`;
}

// ---------- Leaderboard ----------

function store(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}
function load(key) {
  try { return localStorage.getItem(key) || ""; } catch { return ""; }
}

function playerName() {
  return $("name").value.trim();
}

function scorePayload(lvl, value) {
  return JSON.stringify({ level: lvl, name: playerName(), country: $("country").value, streak: value });
}

// Send a finished streak. Returns a promise so the menu can refresh after it lands.
function saveStreak(lvl, value) {
  if (!playerName() || value < 1) return Promise.resolve();
  return fetch("/api/scores", {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: scorePayload(lvl, value),
    keepalive: true,
  }).catch(() => {});
}

// The run is over (wrong answer, help, or leaving the level).
let pendingSave = Promise.resolve();
function endStreak() {
  if (streak > 0) pendingSave = saveStreak(level, streak);
  streak = 0;
  if (level) renderScore();
}

function renderBoard(lvl, rows) {
  const ol = $(`board-${lvl}`);
  if (!rows) {
    ol.innerHTML = `<li class="empty">Leaderboard not available right now.</li>`;
    return;
  }
  if (!rows.length) {
    ol.innerHTML = `<li class="empty">No scores yet. Be the first!</li>`;
    return;
  }
  ol.innerHTML = "";
  rows.forEach((r, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="rank">${i + 1}.</span>${flagImg(r.country)}<span class="who"></span><span class="pts">${r.streak}</span>`;
    li.querySelector(".who").textContent = r.name;
    ol.appendChild(li);
  });
}

async function loadBoards() {
  for (const lvl of [1, 2]) {
    try {
      const res = await fetch(`/api/scores?level=${lvl}`, { cache: "no-store" });
      const data = await res.json();
      renderBoard(lvl, res.ok ? data.top : null);
      // First visit: preselect the country Cloudflare detected.
      if (data.country && !$("country").value && !load("country")) {
        $("country").value = data.country;
      }
    } catch {
      renderBoard(lvl, null);
    }
  }
}

function setupPlayer() {
  const sel = $("country");
  COUNTRY_CODES
    .map((code) => ({ code, name: countryName(code) }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(({ code, name }) => sel.add(new Option(name, code)));
  $("name").value = load("name");
  sel.value = load("country");
  $("name").addEventListener("input", () => store("name", $("name").value.trim()));
  sel.addEventListener("change", () => store("country", sel.value));
}

// Each press of "Help me" reveals one more letter of the answer.
// Keeps the correct part of what was already typed and replaces the rest.
function revealLetter() {
  if (waiting) return;
  helped = true;
  endStreak(); // using help ends the run
  const answer = current.verb.forms[current.slot];
  const box = $("answer");
  const typed = stripAccents(box.value.toLowerCase());
  const plain = stripAccents(answer);
  let n = 0;
  while (n < typed.length && n < plain.length && typed[n] === plain[n]) n++;
  box.value = answer.slice(0, Math.min(n + 1, answer.length));
  $("help").disabled = box.value.length >= answer.length;
  box.focus();
}

function nextQuestion() {
  clearTimeout(advanceTimer);
  waiting = false;
  helped = false;
  $("help").disabled = false;
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

  const answer = current.verb.forms[current.slot];
  const result = check(input, answer);
  const s = scores[level];
  s.total++;
  waiting = true;
  $("answer").disabled = true;
  $("help").disabled = true;

  const fb = $("feedback");
  if (result === "wrong") {
    endStreak();
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
    streak++;
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
  streak = 0;
  lastKey = null;
  $("level-title").textContent = n === 1 ? "Level 1 · Italian → conjugate" : "Level 2 · English → Italian";
  showScreen("game");
  renderScore();
  nextQuestion();
}

function backToMenu() {
  clearTimeout(advanceTimer);
  endStreak();
  level = null;
  showScreen("menu");
  pendingSave.then(loadBoards);
  $("menu-score-1").textContent = scores[1].total ? `${scores[1].right} / ${scores[1].total}` : "";
  $("menu-score-2").textContent = scores[2].total ? `${scores[2].right} / ${scores[2].total}` : "";
}

document.addEventListener("DOMContentLoaded", () => {
  $("play1").addEventListener("click", () => startLevel(1));
  $("play2").addEventListener("click", () => startLevel(2));
  $("back").addEventListener("click", (e) => { e.preventDefault(); backToMenu(); });
  $("form").addEventListener("submit", (e) => { e.preventDefault(); submit(); });
  $("help").addEventListener("click", revealLetter);
  $("answer").addEventListener("input", () => { if (!waiting) $("help").disabled = false; });
  setupPlayer();
  showScreen("menu");
  loadBoards();
});

// Closing or hiding the tab: save the run so far (the best one per name is kept).
function saveOnLeave() {
  if (level && streak > 0 && playerName() && navigator.sendBeacon) {
    navigator.sendBeacon("/api/scores", new Blob([scorePayload(level, streak)], { type: "text/plain" }));
  }
}
window.addEventListener("pagehide", saveOnLeave);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") saveOnLeave(); });

// Export for tests (ignored in the browser).
if (typeof module !== "undefined") module.exports = { check, clean, stripAccents, dropPronoun };
