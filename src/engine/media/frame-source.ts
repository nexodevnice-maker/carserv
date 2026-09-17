/**
 * D'où viennent les images d'une séquence (frame-sequence.ts).
 *
 * `createPackSource` — un seul fichier : images concaténées, table des positions (scripts/media-video.mjs). Chaque
 * image est demandée par requête Range (`bytes=a-b`) : la fenêtre de préchargement reste celle d'images séparées, mais
 * il n'y a qu'un fichier à publier et à mettre en cache. Serveur qui ignore Range (réponse 200 complète — le serveur
 * local de Cloudflare Workers, par exemple) : le fichier entier est gardé une fois et découpé localement. La première
 * requête sert de sonde : les suivantes attendent sa réponse, jamais plusieurs téléchargements complets en parallèle.
 *
 * `createFileSource` — un fichier par image (motif d'URL).
 */
export interface FrameSource {
  readonly count: number;
  fetch(index: number, signal: AbortSignal): Promise<Blob>;
}

export function createPackSource(url: string, offsets: readonly number[], type = 'image/webp'): FrameSource {
  let whole: Promise<Blob> | null = null;
  let probe: Promise<unknown> | null = null;
  const range = (index: number): [number, number] => {
    const start = offsets[index];
    const end = offsets[index + 1];
    if (start === undefined || end === undefined) throw new Error(`[frame-source] image hors séquence : ${index}`);
    return [start, end];
  };
  return {
    count: Math.max(offsets.length - 1, 0),
    async fetch(index, signal) {
      const [start, end] = range(index);
      // Le serveur honore-t-il Range ? La réponse de la première requête le dit.
      if (probe) await probe.catch(() => {});
      if (whole) return (await whole).slice(start, end, type);
      const attempt = (async () => {
        const response = await fetch(url, { headers: { Range: `bytes=${start}-${end - 1}` }, signal });
        if (response.status === 206) return new Blob([await response.arrayBuffer()], { type });
        if (!response.ok) throw new Error(`${response.status} ${url}`);
        whole ??= response.blob();
        return (await whole).slice(start, end, type);
      })();
      probe ??= attempt;
      return attempt;
    },
  };
}

export function createFileSource(url: (index: number) => string, count: number): FrameSource {
  return {
    count,
    async fetch(index, signal) {
      const response = await fetch(url(index), { signal });
      if (!response.ok) throw new Error(`${response.status} ${url(index)}`);
      return response.blob();
    },
  };
}
