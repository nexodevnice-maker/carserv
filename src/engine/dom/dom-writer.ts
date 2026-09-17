/**
 * Écritures DOM groupées et dédoublonnées : une propriété n'est réécrite que si sa valeur change réellement (même
 * chaîne). Aucune lecture de mise en page ici — lire après écrire forcerait un recalcul par image.
 */
export function createDomWriter() {
  const vars = new WeakMap<HTMLElement, Map<string, string>>();
  const attrs = new WeakMap<HTMLElement, Map<string, string | null>>();

  return {
    setVar(el: HTMLElement, name: string, value: string) {
      let map = vars.get(el);
      if (!map) vars.set(el, (map = new Map()));
      if (map.get(name) === value) return;
      map.set(name, value);
      el.style.setProperty(name, value);
    },
    setData(el: HTMLElement, name: string, value: string | null) {
      let map = attrs.get(el);
      if (!map) attrs.set(el, (map = new Map()));
      if (map.get(name) === value) return;
      map.set(name, value);
      if (value === null) delete el.dataset[name];
      else el.dataset[name] = value;
    },
  };
}

export type DomWriter = ReturnType<typeof createDomWriter>;
