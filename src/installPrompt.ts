/**
 * Capture de l'événement `beforeinstallprompt` (Chrome/Edge/Android) : il peut
 * se déclencher avant le montage de React, donc on l'attrape et on le stocke au
 * niveau module, avec un abonnement pour les composants (useSyncExternalStore).
 * Safari (iOS et macOS) et Firefox n'émettent jamais cet événement.
 */
export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const fn of listeners) fn();
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferred = e as BeforeInstallPromptEvent;
  notify();
});

window.addEventListener("appinstalled", () => {
  deferred = null;
  notify();
});

export function getInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferred;
}

/** À appeler après `prompt()` : l'événement est consommé, ne peut pas resservir. */
export function clearInstallPrompt(): void {
  deferred = null;
  notify();
}

export function subscribeInstallPrompt(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
