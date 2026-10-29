# StegGuard site

Static marketing and docs site for [StegGuard](https://github.com/stegguard/stegguard), built with Astro and Tailwind CSS v4. Two pages: the landing page (`/`) and a short CLI reference (`/docs`).

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
```

## Structure

```text
src/layouts/Layout.astro   head/meta tags, nav, command palette, footer
src/pages/index.astro      landing page
src/pages/docs.astro       CLI reference, limits, platform support
src/lib/markdown.ts        markdown table / code-block parser for docs content
src/styles/global.css      design tokens and component styles
public/                    static assets (images)
astro.config.mjs           Astro config; `site` comes from SITE_URL
.github/workflows/         GitHub Pages deploy
```

## Docs content

The Resource limits and Platform support tables (and the limits example command) on `/docs` are parsed at build time from `../stegguard-oss/docs/resource-limits.md` and `platform-support.md`. Edit those files, not the page. The build fails with a clear error if they are missing, so build from inside the monorepo.

## Deploy (GitHub Pages + custom domain)

`.github/workflows/deploy.yml` builds on every push to `main` and publishes `dist/` to GitHub Pages. It checks out `stegguard/stegguard` next to this repo as `stegguard-oss/` so the docs tables can be built.

One-time setup in the site repo:

1. **Settings → Pages → Source:** GitHub Actions.
2. **Settings → Secrets and variables → Actions → Variables:** add `SITE_URL` (e.g. `https://stegguard.com`). It drives canonical and Open Graph URLs.
3. **Settings → Pages → Custom domain:** enter the domain, then tick *Enforce HTTPS* once the certificate is issued.
4. **DNS** (at your registrar, or in Vercel if Vercel manages the domain's DNS):
   - apex `@`: `A` records `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `www`: `CNAME` to `<user-or-org>.github.io`

If `stegguard/stegguard` is private, add a read-only token as the `OSS_REPO_TOKEN` secret and uncomment the `token:` line in the workflow.

## Before launch

- The install command is `pip install git+https://github.com/stegguard/stegguard` until a PyPI release exists (`installCmd` in `src/pages/index.astro`).
