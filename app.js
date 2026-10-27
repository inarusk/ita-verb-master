// Pronoun slots match the order of forms in verbs.js.
// Slot 2 shows "lui" or "lei" at random (same form in the present; in the passato prossimo
// of reflexive verbs the ending differs: si è alzato / si è alzata).
const PRONOUNS = [["io"], ["tu"], ["lui", "lei"], ["noi"], ["voi"], ["loro"]];
const ALL_PRONOUNS = ["io", "tu", "lui", "lei", "noi", "voi", "loro"];

// Levels, in menu order. Rule: the "all verbs" level is always the LAST one, and it is
// the one with the leaderboard. To add a level, insert it before the last entry.
//   types:  which verb groups it uses     prompt: "it" (Italian verb) or "en" (English verb)
//   tense:  "present" or "past" (passato prossimo, reflexive verbs only for now)
const LEVEL_LIST = [
  { name: "Regular verbs", desc: "See the Italian verb, type the conjugated form", types: ["regular"], prompt: "it", tense: "present" },
  { name: "Irregular verbs", desc: "See the Italian verb, type the conjugated form", types: ["irregular"], prompt: "it", tense: "present" },
  { name: "Reflexive verbs", desc: "See the Italian verb, type the form with mi, ti, si…", types: ["reflexive"], prompt: "it", tense: "present" },
  { name: "Verbi riflessivi al passato prossimo", desc: "Reflexive verbs in the past: mi sono alzato/a, ti sei…", types: ["reflexive"], prompt: "it", tense: "past" },
  { name: "All verbs 🏆", desc: "See the English verb, type the Italian conjugated form", types: ["regular", "irregular", "reflexive"], prompt: "en", tense: "present" },
];
const LEVELS = {};
LEVEL_LIST.forEach((l, i) => { LEVELS[i + 1] = { ...l, title: `Level ${i + 1} · ${l.name.replace(" 🏆", "")}` }; });
const LEVEL_NUMBERS = LEVEL_LIST.map((_, i) => i + 1);
const RANKED_LEVEL = LEVEL_LIST.length; // the last level has the leaderboard
// The leaderboard is stored on the server under id 4 (it was Level 4 when it started),
// so existing scores stay when levels are added in front of it.
const BOARD_ID = 4;

// Scores live in memory only: a refresh starts a new session.
const scores = {};
LEVEL_NUMBERS.forEach((n) => { scores[n] = { right: 0, total: 0 }; });

let level = null;
let current = null;   // { verb, slot, pronoun }
// Question order: verbs and pronouns are dealt from shuffled "decks", so every verb
// (and every pronoun) comes up once before any repeats. Mistakes come back 3-4 questions later.
let verbDeck = [];
let pronounDeck = [];
let lastVerb = null;
let lastSlot = null;
let retries = [];     // { verb, slot, pronoun, wait }: wait = other questions still to show first
let waiting = false;  // true while feedback is shown
let advanceTimer = null;
let helped = false;   // help was used on this question
let streak = 0;       // correct answers in a row (no help) in the current level

const $ = (id) => document.getElementById(id);

// Lowercase, trim, collapse spaces.
function clean(s) {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

// Remove accents: "è" -> "e".
function stripAccents(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Drop a leading subject pronoun if the user typed one ("noi parliamo" -> "parliamo",
// "io mi alzo" -> "mi alzo").
function dropPronoun(s) {
  const parts = s.split(" ");
  if (parts.length > 1 && ALL_PRONOUNS.includes(parts[0])) {
    return parts.slice(1).join(" ");
  }
  return s;
}

// All accepted answers for a question; the first one is the "main" spelling.
function answersFor(q) {
  if (LEVELS[level].tense !== "past") return [q.verb.forms[q.slot]];
  // Passato prossimo of a reflexive verb: reflexive pronoun + essere + participle,
  // and the participle agrees with the subject. Where the pronoun doesn't tell
  // (io, tu, noi, voi, loro) both masculine and feminine are accepted.
  const pp = q.verb.pp;
  const lead = ["mi sono", "ti sei", "si è", "ci siamo", "vi siete", "si sono"][q.slot];
  if (q.slot === 2) return [`${lead} ${pp}${q.pronoun === "lei" ? "a" : "o"}`];
  const [m, f] = q.slot < 2 ? ["o", "a"] : ["i", "e"];
  return [`${lead} ${pp}${m}`, `${lead} ${pp}${f}`];
}

// How the correct answer is shown: "mi sono alzato/a", "ci siamo alzati/e".
function shownAnswer(q) {
  const a = answersFor(q);
  return a.length > 1 ? `${a[0]}/${a[1].slice(-1)}` : a[0];
}

// Returns "exact", "accent" (right except accents) or "wrong", against any accepted answer.
function check(input, answers) {
  const list = Array.isArray(answers) ? answers : [answers];
  const typed = dropPronoun(clean(input));
  if (list.some((a) => typed === clean(a))) return "exact";
  if (list.some((a) => stripAccents(typed) === stripAccents(clean(a)))) return "accent";
  return "wrong";
}

// Which accepted answer the user is typing towards (for Help me and the "spelled" note).
function closestAnswer(input, answers) {
  const typed = stripAccents(dropPronoun(clean(input)));
  let best = answers[0], bestLen = -1;
  for (const a of answers) {
    const plain = stripAccents(a);
    let n = 0;
    while (n < typed.length && n < plain.length && typed[n] === plain[n]) n++;
    if (n > bestLen) { best = a; bestLen = n; }
  }
  return best;
}

function verbsFor(lvl) {
  return VERBS.filter((v) => LEVELS[lvl].types.includes(v.type));
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Deal the next card from a deck, reshuffling when it runs out.
// After a reshuffle the first card is never the same as the previous one.
function deal(deck, items, previous) {
  if (!deck.length) {
    deck.push(...shuffle(items));
    if (deck.length > 1 && deck[0] === previous) deck.push(deck.shift());
  }
  return deck.shift();
}

function resetQueue() {
  verbDeck = [];
  pronounDeck = [];
  lastVerb = null;
  lastSlot = null;
  retries = [];
}

// Put the exact same question back in the queue, 3 or 4 questions from now.
function scheduleRetry(q) {
  retries.push({ verb: q.verb, slot: q.slot, pronoun: q.pronoun, wait: 3 + Math.floor(Math.random() * 2) });
}

function pickQuestion() {
  let q;
  // A retry that's due goes first (one per question; others wait their turn).
  const due = retries.findIndex((r) => r.wait <= 0);
  if (due >= 0) {
    const r = retries.splice(due, 1)[0];
    q = { verb: r.verb, slot: r.slot, pronoun: r.pronoun, retry: true };
  } else {
    const verb = deal(verbDeck, verbsFor(level), lastVerb);
    const slot = deal(pronounDeck, [0, 1, 2, 3, 4, 5], lastSlot);
    const options = PRONOUNS[slot];
    q = { verb, slot, pronoun: options[Math.floor(Math.random() * options.length)] };
  }
  retries.forEach((r) => r.wait--);
  lastVerb = q.verb;
  lastSlot = q.slot;
  return q;
}

// Level buttons are built from LEVEL_LIST, so adding a level needs no HTML changes.
function buildMenu() {
  const box = $("levels");
  for (const n of LEVEL_NUMBERS) {
    const l = LEVELS[n];
    const btn = document.createElement("button");
    btn.className = "level-btn" + (n === RANKED_LEVEL ? " ranked" : "");
    btn.id = `play${n}`;
    btn.innerHTML = `<em class="best" id="menu-score-${n}"></em><strong></strong><span></span>`;
    btn.querySelector("strong").textContent = `Level ${n} · ${l.name}`;
    btn.querySelector("span").textContent = l.desc;
    btn.addEventListener("click", () => startLevel(n));
    box.appendChild(btn);
  }
  $("board-title").textContent = `Level ${RANKED_LEVEL} leaderboard · best streaks`;
  $("board-level").textContent = `Level ${RANKED_LEVEL}`;
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

// ---------- Leaderboard (last level only) ----------

function store(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}
function load(key) {
  try { return localStorage.getItem(key) || ""; } catch { return ""; }
}

function playerName() {
  return $("name").value.trim();
}

function scorePayload(value) {
  return JSON.stringify({ level: BOARD_ID, name: playerName(), country: $("country").value, streak: value });
}

// Send a finished streak. Returns a promise so the menu can refresh after it lands.
function saveStreak(value) {
  if (!playerName() || value < 1) return Promise.resolve();
  return fetch("/api/scores", {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: scorePayload(value),
    keepalive: true,
  }).catch(() => {});
}

// The run is over (wrong answer, help, or leaving the level).
let pendingSave = Promise.resolve();
function endStreak() {
  if (streak > 0 && level === RANKED_LEVEL) pendingSave = saveStreak(streak);
  streak = 0;
  if (level) renderScore();
}

function renderBoard(rows) {
  const ol = $("board");
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

async function loadBoard() {
  try {
    const res = await fetch(`/api/scores?level=${BOARD_ID}`, { cache: "no-store" });
    const data = await res.json();
    renderBoard(res.ok ? data.top : null);
    // First visit: preselect the country Cloudflare detected.
    if (data.country && !$("country").value && !load("country")) {
      $("country").value = data.country;
    }
  } catch {
    renderBoard(null);
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

// ---------- Game ----------

// Each press of "Help me" reveals one more letter of the answer.
// Keeps the correct part of what was already typed and replaces the rest.
// Spaces are skipped, so "mi alzo" goes m, mi, mi a, mi al...
function revealLetter() {
  if (waiting) return;
  helped = true;
  endStreak(); // using help ends the run
  const box = $("answer");
  const answer = closestAnswer(box.value, answersFor(current));
  const typed = stripAccents(box.value.toLowerCase().replace(/\s+/g, " ").replace(/^\s+/, ""));
  const plain = stripAccents(answer);
  let n = 0;
  while (n < typed.length && n < plain.length && typed[n] === plain[n]) n++;
  let end = Math.min(n + 1, answer.length);
  if (answer[end - 1] === " ") end = Math.min(end + 1, answer.length);
  box.value = answer.slice(0, end);
  $("help").disabled = box.value.length >= answer.length;
  box.focus();
}

function showPrompt() {
  const v = current.verb;
  if (LEVELS[level].prompt === "it") {
    // Italian verb with the English in brackets; inner hint brackets become a dash.
    const en = v.en.replace(/\s*\((.*)\)/, " – $1");
    $("verb").innerHTML = `${v.it} <span class="en">(${en})</span>`;
  } else {
    $("verb").textContent = v.en;
    if (v.type === "reflexive") {
      $("verb").insertAdjacentHTML("beforeend", ` <span class="tag">reflexive</span>`);
    }
  }
}

function nextQuestion() {
  clearTimeout(advanceTimer);
  waiting = false;
  helped = false;
  $("help").disabled = false;
  current = pickQuestion();
  showPrompt();
  $("pronoun").textContent = current.pronoun;
  $("answer").value = "";
  $("answer").readOnly = false;
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

  const answers = answersFor(current);
  const result = check(input, answers);
  const answer = result === "wrong" ? shownAnswer(current) : closestAnswer(input, answers);
  if (result === "wrong" || helped) scheduleRetry(current); // ask it again soon
  const s = scores[level];
  s.total++;
  waiting = true;
  // Read-only (not disabled) keeps the phone keyboard open between questions.
  $("answer").readOnly = true;
  $("help").disabled = true;

  const fb = $("feedback");
  if (result === "wrong") {
    endStreak();
    fb.className = "feedback wrong";
    fb.innerHTML = `✗ Correct answer: <strong>${answer}</strong>` +
      (LEVELS[level].prompt === "en" ? ` <span class="sub">(${current.verb.it})</span>` : "");
    $("submit").textContent = "Next";
    $("answer").focus();
  } else if (helped) {
    // Right, but with help: no point, and wait for Enter like a wrong answer.
    fb.className = "feedback right";
    fb.innerHTML = `✓ <strong>${answer}</strong>, with help (no point)`;
    $("submit").textContent = "Next";
    $("answer").focus();
  } else {
    s.right++;
    streak++;
    fb.className = "feedback right";
    if (result === "accent") {
      fb.innerHTML = `✓ Correct, spelled <strong>${answer}</strong>`;
      advanceTimer = setTimeout(nextQuestion, 2000);
    } else {
      fb.textContent = "✓ Correct";
      advanceTimer = setTimeout(nextQuestion, 600);
    }
    $("submit").textContent = "Next";
    $("answer").focus();
  }
  renderScore();
}

function startLevel(n) {
  level = n;
  streak = 0;
  resetQueue();
  $("level-title").textContent = LEVELS[n].title;
  showScreen("game");
  renderScore();
  nextQuestion();
}

function backToMenu() {
  clearTimeout(advanceTimer);
  endStreak();
  level = null;
  showScreen("menu");
  pendingSave.then(loadBoard);
  for (const n of LEVEL_NUMBERS) {
    $(`menu-score-${n}`).textContent = scores[n].total ? `${scores[n].right} / ${scores[n].total}` : "";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  buildMenu();
  $("back").addEventListener("click", (e) => { e.preventDefault(); backToMenu(); });
  $("form").addEventListener("submit", (e) => { e.preventDefault(); submit(); });
  $("help").addEventListener("click", revealLetter);
  $("answer").addEventListener("input", () => {
    if (waiting) return;
    $("help").disabled = false;
    // A correct answer is checked as soon as it's typed, no Enter needed.
    // Wrong answers still need Enter, so you're never cut off mid-word.
    if (check($("answer").value, answersFor(current)) !== "wrong") submit();
  });
  setupPlayer();
  showScreen("menu");
  loadBoard();
});

// Closing or hiding the tab during the ranked level: save the run so far (the best one per name is kept).
function saveOnLeave() {
  if (level === RANKED_LEVEL && streak > 0 && playerName() && navigator.sendBeacon) {
    navigator.sendBeacon("/api/scores", new Blob([scorePayload(streak)], { type: "text/plain" }));
  }
}
window.addEventListener("pagehide", saveOnLeave);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") saveOnLeave(); });

// Export for tests (ignored in the browser).
if (typeof module !== "undefined") module.exports = { check, clean, stripAccents, dropPronoun };
