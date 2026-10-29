// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Production URL for canonical/og tags. CI can override it with the repo's
  // SITE_URL Actions variable.
  site: process.env.SITE_URL || 'https://stegguard.com',
  vite: {
    plugins: [tailwindcss()]
  }
});