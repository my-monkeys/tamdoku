/** Événements Umami — no-op si le script n'est pas chargé (dev, bloqueur). */
type EventData = Record<string, string | number | boolean>;

interface UmamiGlobal {
  track: (event: string, data?: EventData) => void;
}

export function track(event: string, data?: EventData): void {
  try {
    (window as unknown as { umami?: UmamiGlobal }).umami?.track(event, data);
  } catch {
    /* analytics indisponible : sans effet sur le jeu */
  }
}
