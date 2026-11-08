# StegGuard site

Static marketing and docs site for [StegGuard](https://github.com/stegguard/stegguard), built with Astro and hand-written CSS (v2 theme: dark first, Geist type, one signal orange for findings). The landing page (`/`), a demo (`/demo`), a blog (`/blog`) and a short CLI reference (`/docs`).

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
scripts/build_blog.py      regenerates src/data/blog.json (every output block on /blog)
src/styles/global.css      theme tokens (dark default + light) and component styles
public/                    static assets (images)
astro.config.mjs           Astro config; `site` comes from SITE_URL
.github/workflows/         GitHub Pages deploy
```

## Docs content

The Resource limits and Platform support tables (and the limits example command) on `/docs` are parsed at build time from `../stegguard-oss/docs/resource-limits.md` and `platform-support.md`. Edit those files, not the page. The build fails with a clear error if they are missing, so build from inside the monorepo.

## Demo and blog output

`/demo` shows a real StegGuard run over the files in [stegguard/samples](https://github.com/stegguard/samples). `/blog` shows real output for sample files the script writes itself. The generated files (`public/demo/report.html`, `src/data/demo.json`, `src/data/blog.json`) are committed, so the deploy needs neither the samples nor Python.

Regenerate both after a release, so the pages show the version `RELEASE` advertises. Run them against that PyPI release, not the `../stegguard-oss` checkout, which may be older or carry unreleased changes:

```sh
uv tool install stegguard==0.5.0     # or a clean venv; Python 3.12 to 3.14
stegguard --version                  # check PATH picks up this one, not an older install
git clone https://github.com/stegguard/samples ../../stegno_samples   # first time only

python3 scripts/build_demo.py --stegguard stegguard
python3 scripts/build_blog.py        # uses `stegguard` from PATH by default
npm test                             # src/lib/demo.test.ts checks the demo output
```

- `--stegguard` takes the CLI itself (a name on PATH or a path), or a uv project directory, which runs through `uv run`. Without it, `build_demo.py` runs `../stegguard-oss`. `--samples` points `build_demo.py` at another samples checkout.
- `build_blog.py` resets the post date (`generated` in `blog.json`) to the day of the run. Set it back to the publish date before committing, unless the post should show a new date.
- After regenerating, read the blog's prose around anything that changed. The output blocks update on their own, but the sentences about them don't.
- Both scripts run on Windows as well as POSIX systems, and always write forward-slash paths and LF line endings. Report element ids hash the file paths, so a Windows run gives different ids from a POSIX one, but the same ids on every rerun.

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
