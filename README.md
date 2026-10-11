# Ita Verb Master

Practise Italian present-tense verb conjugation.

- **Level 1:** see the Italian verb and a pronoun, then type the conjugated form.
- **Level 2:** see the English verb and a pronoun, then type the Italian conjugated form.

It's a plain static site with no build step: `index.html`, `app.js` and `verbs.js`.
Open `index.html` in a browser to run it locally.

## Adding verbs

Edit `verbs.js`. Each verb is one line with its six forms in this order: io, tu, lui/lei, noi, voi, loro.

## Hosting

The site is on Cloudflare Pages, connected to this repo. Every push to `main` redeploys it.
It needs no build command, and the output directory is `/`.
