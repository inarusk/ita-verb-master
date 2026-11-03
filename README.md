# Ita Verb Master

Practise Italian verb conjugation: presente indicativo and passato prossimo.

The menu has two columns.

**Presente**
1. Regular verbs, prompted in Italian.
2. Irregular verbs, prompted in Italian.
3. Reflexive verbs, prompted in Italian. The answer includes mi / ti / si / ci / vi / si.
4. All verbs, prompted in English. This is the only level with a leaderboard.

**Passato prossimo**
1. Verbs with avere (ho mangiato).
2. Verbs with essere (sono andato/a). The question says maschile or femminile.
3. Reflexive verbs (mi sono alzato/a). The question says maschile or femminile.
4. All passato verbs, prompted in English.

Levels are defined in `LEVEL_LIST` at the top of `app.js`, and the menu is built from it. In each column the
"all verbs" level is always the last one; new levels go in front of it. The leaderboard is stored under id 4 on the
server, whatever the level's position, so the existing scores carry over.

Static files (`index.html`, `app.js`, `verbs.js`, `countries.js`, `flags/`) plus one Cloudflare Pages Function
(`functions/api/scores.js`) for the leaderboard. There's no build step.

## Adding verbs

Edit `verbs.js`. Each verb is one line with a `type` (`regular`, `irregular` or `reflexive`, which decides its level)
and its six forms in this order: io, tu, lui/lei, noi, voi, loro. Verbs in the passato prossimo level also have `pp`,
the past participle without its last vowel ("mangiat"), and `aux` ("avere" or "essere"; reflexive verbs always use
essere). Verbs only practised in the past use `type: "pastonly"` and need no present forms.

## Hosting

The site is on Cloudflare Pages, connected to this repo. Every push to `main` redeploys it.
It needs no build command, and the output directory is `/`.

## Leaderboard

- Players who enter a name get their longest streak in Presente · All verbs saved in a single top 10. Using Help me ends a streak.
- Storage is a Cloudflare D1 database bound to the Pages project as `DB`. The table is created automatically on first use.
- Only name, country, streak and date are stored, with no IP addresses.
- To delete an entry, go to Cloudflare dashboard → D1 → the database → Console, and run, for example:
  `DELETE FROM scores WHERE name = 'Some Name';`
- Flags come from [flag-icons](https://github.com/lipis/flag-icons) (MIT licence).
