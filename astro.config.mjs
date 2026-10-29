// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Production URL for canonical/og tags. CI sets SITE_URL from the repo's
  // Actions variable; the fallback is a placeholder until the domain is final.
  site: process.env.SITE_URL || 'https://stegguard.dev',
  vite: {
    plugins: [tailwindcss()]
  }
});