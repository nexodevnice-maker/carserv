import type { APIRoute } from 'astro';

// Préproduction (PUBLIC_INDEXABLE=false au build) : aucune exploration. Adresse : `site`, astro.config.mjs.
// Le laboratoire du moteur n'est jamais exploré.
export const GET: APIRoute = ({ site }) => {
  const open = Boolean(site) && import.meta.env.PUBLIC_INDEXABLE !== 'false';
  const lines = ['User-agent: *', open ? 'Allow: /' : 'Disallow: /', 'Disallow: /lab/'];
  if (open && site) lines.push('', `Sitemap: ${new URL('sitemap-index.xml', site).href}`);
  return new Response(`${lines.join('\n')}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
