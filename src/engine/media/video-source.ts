/**
 * Vidéo de scrub chargée entièrement en mémoire, servie à l'élément par une URL `blob:`.
 * Un seek sur une vidéo servie en HTTP exige des requêtes Range ; sans elles `seekable` reste vide et tous les seeks
 * échouent en silence (leçon Agenceeimoo). Or le serveur de fichiers de Cloudflare Workers exécuté localement
 * (`wrangler dev`, 17/09/2026) répond 200 complet à une requête Range. Une URL `blob:` est seekable dans tous les
 * navigateurs, quel que soit l'hébergeur : le scrub ne dépend plus du serveur. Coût : le fichier entier est téléchargé
 * avant le premier seek (l'affiche couvre l'attente) — ce que `preload="auto"` faisait déjà pour un scrub.
 */
export interface VideoBlob {
  url: string;
  bytes: number;
  revoke(): void;
}

export async function loadVideoBlob(src: string, signal?: AbortSignal): Promise<VideoBlob> {
  const response = await fetch(src, { signal });
  if (!response.ok) throw new Error(`${response.status} ${src}`);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob.type ? blob : new Blob([blob], { type: 'video/mp4' }));
  return { url, bytes: blob.size, revoke: () => URL.revokeObjectURL(url) };
}
