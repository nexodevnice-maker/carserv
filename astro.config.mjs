import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Adresse de production (Cloudflare Workers, projet « carservice ») : base des URLs absolues (canonique, Open Graph)
// et du sitemap. Nouveau domaine : SITE_URL=https://… au build, ou changer la valeur ici.
// Préproduction non indexable : PUBLIC_INDEXABLE=false au build.
const site = process.env.SITE_URL || 'https://carservice.nexodevnice.workers.dev';

/**
 * LE BANC D'ESSAI NE SORT PAS D'ICI.
 *
 * `/lab/engine` est le banc d'essai du moteur, et `npm run qa:engine` s'appuie dessus : c'est là que se mesurent la
 * piste, l'état, la caméra, le GPU et l'accessibilité. Il doit donc exister en développement. Mais il n'a rien à
 * faire en ligne : jusqu'ici il y était, accessible à qui connaissait l'adresse, avec les quinze mégaoctets de
 * vidéo et de séquence d'images dont il est le seul consommateur.
 *
 * On le construit, puis on le RETIRE du paquet — lui et ses médias. Le `robots.txt` ne suffisait pas : il
 * déconseille aux robots, il n'interdit à personne.
 */
function sansBancDEssai() {
  return {
    name: 'sans-banc-d-essai',
    hooks: {
      'astro:build:done': ({ dir }) => {
        const racine = fileURLToPath(dir);
        for (const chemin of ['lab', 'media/transformation']) {
          rmSync(new URL(chemin, dir), { recursive: true, force: true });
        }
        console.log(`[sans-banc-d-essai] /lab et /media/transformation retirés de ${racine}`);
      },
    },
  };
}

export default defineConfig({
  site,
  // Le laboratoire du moteur (/lab/) n'entre jamais dans le sitemap — ni, désormais, dans le paquet publié.
  integrations: [sitemap({ filter: (page) => !page.includes('/lab/') }), sansBancDEssai()],
  devToolbar: { enabled: false },
  server: { port: 4321 },
});
