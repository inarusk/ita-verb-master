// Leaderboard API (Cloudflare Pages Function, D1 database bound as "DB").
//   GET  /api/scores?level=4   -> top 10 (only Level 4 is ranked), plus the visitor's country
//   POST /api/scores           -> { level, name, country, streak } saves a streak
// One entry per name + country per level; only the best streak is kept.
// Nothing personal is stored: no IP addresses, only name, country, streak, date.

const TOP_N = 10;
const RANKED = [4]; // levels that have a leaderboard
const MAX_NAME = 20;

// Names containing any of these words are rejected (English + Italian basics).
const BLOCKED = [
  "fuck", "shit", "cunt", "bitch", "whore", "slut", "dick", "cock", "pussy", "nigger", "nigga",
  "faggot", "fag", "retard", "rape", "hitler", "nazi",
  "cazzo", "vaffanculo", "fanculo", "stronzo", "stronza", "puttana", "troia", "coglione",
  "merda", "figa", "frocio", "negro", "mignotta", "zoccola",
];

const SCHEMA = `CREATE TABLE IF NOT EXISTS scores (
  level INTEGER NOT NULL,
  name TEXT NOT NULL,
  name_key TEXT NOT NULL,
  country TEXT NOT NULL,
  streak INTEGER NOT NULL,
  achieved_at INTEGER NOT NULL,
  PRIMARY KEY (level, name_key, country)
)`;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

function cleanName(raw) {
  return String(raw || "")
    .replace(/[\u0000-\u001f\u007f<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NAME);
}

function isBlocked(name) {
  const plain = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e").replace(/4/g, "a").replace(/5/g, "s");
  const words = plain.split(/[^a-z]+/).filter(Boolean);
  const joined = words.join("");
  return BLOCKED.some((w) => words.includes(w) || (w.length >= 5 && joined.includes(w)));
}

async function ensureTable(db) {
  await db.prepare(SCHEMA).run();
}

async function topList(db, level) {
  const { results } = await db
    .prepare("SELECT name, country, streak FROM scores WHERE level = ? ORDER BY streak DESC, achieved_at ASC LIMIT ?")
    .bind(level, TOP_N)
    .all();
  return results;
}

export async function onRequestGet({ request, env }) {
  const level = Number(new URL(request.url).searchParams.get("level"));
  const country = request.cf?.country || "";
  if (!RANKED.includes(level)) return json({ error: "bad level" }, 400);
  if (!env.DB) return json({ error: "no database", top: [], country }, 503);
  await ensureTable(env.DB);
  return json({ top: await topList(env.DB, level), country });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: "no database" }, 503);
  let body;
  try {
    body = JSON.parse(await request.text()); // sent as text/plain so sendBeacon works
  } catch {
    return json({ error: "bad json" }, 400);
  }
  const level = Number(body.level);
  const streak = Number(body.streak);
  const name = cleanName(body.name);
  let country = String(body.country || "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) country = "";

  if (!RANKED.includes(level)) return json({ error: "bad level" }, 400);
  if (!Number.isInteger(streak) || streak < 1 || streak > 100000) return json({ error: "bad streak" }, 400);
  if (!name) return json({ error: "no name" }, 400);
  if (isBlocked(name)) return json({ error: "name not allowed" }, 400);

  await ensureTable(env.DB);
  // Insert, or raise the existing best. Ties keep the earlier date (ranks higher).
  await env.DB
    .prepare(`INSERT INTO scores (level, name, name_key, country, streak, achieved_at)
              VALUES (?, ?, ?, ?, ?, ?)
              ON CONFLICT (level, name_key, country) DO UPDATE SET
                streak = excluded.streak, name = excluded.name, achieved_at = excluded.achieved_at
              WHERE excluded.streak > scores.streak`)
    .bind(level, name, name.toLowerCase(), country, streak, Date.now())
    .run();
  return json({ ok: true });
}
