import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Adresse de production (Cloudflare Workers, projet « carservice ») : base des URLs absolues (canonique, Open Graph)
// et du sitemap. Nouveau domaine : SITE_URL=https://… au build, ou changer la valeur ici.
// Préproduction non indexable : PUBLIC_INDEXABLE=false au build.
const site = process.env.SITE_URL || 'https://carservice.nexodevnice.workers.dev';

export default defineConfig({
  site,
  // Le laboratoire du moteur (/lab/) n'entre jamais dans le sitemap.
  integrations: [sitemap({ filter: (page) => !page.includes('/lab/') })],
  devToolbar: { enabled: false },
  server: { port: 4321 },
});
