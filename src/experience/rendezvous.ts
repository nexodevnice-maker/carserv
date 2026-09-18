import { CONTACT } from './config';

/**
 * Prise de rendez-vous : la bande de dates est régénérée à partir d'aujourd'hui (un site statique ne doit jamais
 * proposer une date passée), puis la demande est assemblée dans un courriel prêt à envoyer.
 * Aucun serveur, aucune donnée stockée ni transmise à un tiers : le client relit son message dans sa messagerie et
 * décide de l'envoyer. Sans script, le lien courriel écrit dans la page reste utilisable.
 */
const DAYS = 14;

const iso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const short = (date: Date, options: Intl.DateTimeFormatOptions) => date.toLocaleDateString('fr-FR', options).replaceAll('.', '');

export function initRendezvous() {
  const root = document.querySelector<HTMLElement>('[data-rdv]');
  if (!root) return null;
  const inbox = root.dataset.inbox || CONTACT.inbox;
  const strip = root.querySelector<HTMLElement>('[data-rdv-days]');
  const send = root.querySelector<HTMLAnchorElement>('[data-rdv-send]');

  // — Dates réelles, à partir de demain.
  const today = new Date();
  const dates = new Map<string, Date>();
  if (strip) {
    const labels = [...strip.querySelectorAll<HTMLLabelElement>('label')].slice(0, DAYS);
    labels.forEach((label, k) => {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + k + 1);
      const input = label.querySelector('input');
      const weekday = label.querySelector('.day__weekday');
      const num = label.querySelector('.day__num');
      const month = label.querySelector('.day__month');
      if (!input || !weekday || !num || !month) return;
      input.value = iso(date);
      dates.set(input.value, date);
      weekday.textContent = short(date, { weekday: 'short' });
      num.textContent = String(date.getDate());
      month.textContent = short(date, { month: 'short' });
      // Un dimanche n'est pas refusé (aucun horaire n'est confirmé), mais il est signalé comme moins probable.
      label.classList.toggle('day--sunday', date.getDay() === 0);
    });
  }

  const value = (name: string) => {
    const field = root.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[name="${name}"]`);
    return field?.value.trim() ?? '';
  };
  const checked = (name: string) => root.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.value ?? '';

  /** Champs obligatoires : on ne prépare pas un courriel qui obligerait l'entreprise à rappeler pour tout demander. */
  const missing = () => {
    for (const name of ['rdv-nom', 'rdv-tel', 'rdv-commune']) {
      const field = root.querySelector<HTMLInputElement>(`[name="${name}"]`);
      if (field && !field.value.trim()) return field;
    }
    return null;
  };

  const compose = () => {
    const key = checked('rdv-date');
    const date = dates.get(key);
    const day = date ? date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : key;
    const slot = checked('rdv-slot');
    const lines = [
      'Demande de rendez-vous — CAR SERVICE 06',
      '',
      `Date souhaitée : ${day}`,
      `Créneau souhaité : ${slot}`,
      `Besoin : ${value('rdv-besoin')}`,
      '',
      `Nom : ${value('rdv-nom')}`,
      `Téléphone : ${value('rdv-tel')}`,
      `Commune (06) : ${value('rdv-commune')}`,
      `Véhicule : ${value('rdv-vehicule') || '—'}`,
      '',
      `Précisions : ${value('rdv-message') || '—'}`,
      '',
      'Envoyé depuis le site CAR SERVICE 06.',
    ];
    const subject = `Rendez-vous CAR SERVICE 06 — ${date ? short(date, { weekday: 'short', day: 'numeric', month: 'short' }) : key}${slot ? ` (${slot})` : ''}`;
    return `mailto:${inbox}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\r\n'))}`;
  };

  const onSend = (event: MouseEvent) => {
    const empty = missing();
    if (empty) {
      event.preventDefault();
      empty.focus();
      root.dataset.rdvState = 'incomplet';
      return;
    }
    // Le courriel est assemblé au dernier moment : il contient exactement ce qui est à l'écran.
    if (send) send.href = compose();
    root.dataset.rdvState = 'envoi';
  };
  send?.addEventListener('click', onSend);

  return {
    compose,
    dispose() {
      send?.removeEventListener('click', onSend);
    },
  };
}
