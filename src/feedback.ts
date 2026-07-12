/**
 * Envoi d'un retour utilisateur vers l'intake feedback du dashboard monkey
 * (public, CORS *, POST navigateur direct). Apparaît sur monkey.cookie/feedback,
 * filtrable par produit. Le CSP `upgrade-insecure-requests` d'index.html couvre le
 * gotcha O2switch (Tiger Protect 307 → http).
 */
const ENDPOINT = "https://git.my-monkey.fr/api/feedback";

export async function sendFeedback(message: string, email: string, context: string): Promise<boolean> {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        product: "tamdoku",
        message,
        email: email || undefined,
        context,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
