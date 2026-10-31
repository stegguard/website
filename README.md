# StegGuard site

Static marketing and docs site for [StegGuard](https://github.com/stegguard/stegguard), built with Astro and hand-written CSS (Anthropic theme: warm paper, terracotta). The landing page (`/`), a demo (`/demo`), a blog (`/blog`) and a short CLI reference (`/docs`).

## Requirements

Node 22.23.4 (pinned in `.nvmrc`):

```sh
nvm use
```

## Commands

```sh
npm install     # install dependencies
npm run dev     # dev server at http://localhost:4321
npm run build   # static build to ./dist
npm run preview # serve the built site locally
npm test        # node:test suites for src/lib
```

## Structure

```text
src/layouts/Layout.astro   head/meta tags, theme toggle, top bar, footer, copy buttons
src/components/CodeBlock.astro  dark code panel with header strip and copy button
src/pages/index.astro      landing page (hero specimen reveals hidden characters)
src/pages/docs.astro       CLI reference, limits, platform support
src/lib/markdown.ts        markdown table / code-block parser for docs content
src/lib/reveal.ts          splits text into visible text and hidden-character runs
src/lib/highlight.ts       minimal shell highlighter for code panels
src/pages/demo.astro       demo: walkthrough of one sample plus the full report
src/pages/blog.astro       blog: single-page article with an on-page TOC
scripts/build_demo.py      regenerates public/demo/report.html and src/data/demo.json
src/styles/global.css      theme tokens (light + dark) and component styles
public/                    static assets (images)
astro.config.mjs           Astro config; `site` comes from SITE_URL
.github/workflows/         GitHub Pages deploy
```

## Docs content

The Resource limits and Platform support tables (and the limits example command) on `/docs` are parsed at build time from `../stegguard-oss/docs/resource-limits.md` and `platform-support.md`. Edit those files, not the page. The build fails with a clear error if they are missing, so build from inside the monorepo.

## Demo page

`/demo` shows a real StegGuard run over the files in [stegguard/samples](https://github.com/stegguard/samples), checked out at `../../stegno_samples`. The HTML report (`public/demo/report.html`) and the page's numbers (`src/data/demo.json`) are generated, then committed, so the deploy needs neither the samples nor Python. To refresh them after changing the samples or the report generator:

```sh
python3 scripts/build_demo.py   # needs uv and ../stegguard-oss
npm test                        # src/lib/demo.test.ts checks the output
```

## Deploy (GitHub Pages + custom domain)

`.github/workflows/deploy.yml` builds on every push to `main` and publishes `dist/` to GitHub Pages. It checks out `stegguard/stegguard` next to this repo as `stegguard-oss/` so the docs tables can be built.

One-time setup in the site repo:

1. **Settings → Pages → Source:** GitHub Actions.
2. **Settings → Secrets and variables → Actions → Variables:** optionally add `SITE_URL` to override the default `https://stegguard.com`. It drives canonical and Open Graph URLs.
3. **Settings → Pages → Custom domain:** enter `stegguard.com`, then tick *Enforce HTTPS* once the certificate is issued.
4. **DNS** (at your registrar, or in Vercel if Vercel manages the domain's DNS):
   - apex `@`: `A` records `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `www`: `CNAME` to `stegguard.github.io.`

If `stegguard/stegguard` is private, add a read-only token as the `OSS_REPO_TOKEN` secret and uncomment the `token:` line in the workflow.

## Before launch

- The install command and advertised version come from `src/lib/install.ts`. Bump `RELEASE` there (and its test) when a new version is published to [PyPI](https://pypi.org/project/stegguard/).
