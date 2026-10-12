# Ita Verb Master

Practise Italian present-tense verb conjugation.

- **Level 1:** regular verbs, prompted in Italian.
- **Level 2:** irregular verbs, prompted in Italian.
- **Level 3:** reflexive verbs, prompted in Italian. The answer includes mi / ti / si / ci / vi / si.
- **Level 4:** all verbs, prompted in English. This is the only level with a leaderboard.

Static files (`index.html`, `app.js`, `verbs.js`, `countries.js`, `flags/`) plus one Cloudflare Pages Function
(`functions/api/scores.js`) for the leaderboard. There's no build step.

## Adding verbs

Edit `verbs.js`. Each verb is one line with a `type` (`regular`, `irregular` or `reflexive`, which decides its level)
and its six forms in this order: io, tu, lui/lei, noi, voi, loro.

## Hosting

The site is on Cloudflare Pages, connected to this repo. Every push to `main` redeploys it.
It needs no build command, and the output directory is `/`.

## Leaderboard

- Players who enter a name get their longest Level 4 streak saved in a single top 10. Using Help me ends a streak.
- Storage is a Cloudflare D1 database bound to the Pages project as `DB`. The table is created automatically on first use.
- Only name, country, streak and date are stored, with no IP addresses.
- To delete an entry, go to Cloudflare dashboard → D1 → the database → Console, and run, for example:
  `DELETE FROM scores WHERE name = 'Some Name';`
- Flags come from [flag-icons](https://github.com/lipis/flag-icons) (MIT licence).
