import { useEffect, useState } from "react";
import type { useGame } from "../useGame.ts";
import { usePopIn } from "../usePopIn.ts";
import { sendFeedback } from "../feedback.ts";
import { track } from "../analytics.ts";

type Status = "idle" | "sending" | "sent" | "error";

export function FeedbackModal({ ctrl }: { ctrl: ReturnType<typeof useGame> }) {
  const { g } = ctrl;
  const card = usePopIn<HTMLDivElement>([g.feedbackOpen]);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  // Repartir d'un formulaire propre à chaque ouverture.
  useEffect(() => {
    if (g.feedbackOpen) setStatus("idle");
  }, [g.feedbackOpen]);

  if (!g.feedbackOpen) return null;

  const canSend = message.trim().length >= 2 && status !== "sending";

  const submit = async () => {
    if (!canSend) return;
    setStatus("sending");
    const ok = await sendFeedback(message.trim(), email.trim(), `web · écran: ${g.screen}`);
    if (ok) {
      track("feedback_sent");
      setStatus("sent");
      setMessage("");
      setEmail("");
    } else {
      setStatus("error");
    }
  };

  return (
    <div className="ov" onClick={ctrl.closeFeedback}>
      <div className="fbcard" ref={card} onClick={(e) => e.stopPropagation()}>
        {status === "sent" ? (
          <>
            <div className="fbtitle">Merci ! 🍌</div>
            <div className="fbtext">Ton retour est bien arrivé — ça nous aide à améliorer Tamdoku.</div>
            <button className="obtn" style={{ marginTop: 18 }} onClick={ctrl.closeFeedback}>
              Fermer
            </button>
          </>
        ) : (
          <>
            <div className="fbtitle">Un retour ?</div>
            <div className="fbtext">Une idée, un bug, une station qui manque ? Dis-nous tout.</div>
            <textarea
              className="fbinput fbmsg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ton message…"
              rows={4}
              maxLength={4000}
              autoFocus
            />
            <input
              className="fbinput"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ton email (facultatif, pour une réponse)"
              type="email"
              autoComplete="email"
            />
            {status === "error" && <div className="fberr">Oups, l'envoi a échoué. Réessaie dans un instant.</div>}
            <div className="fbrow">
              <button className="obtn sec" onClick={ctrl.closeFeedback}>
                Annuler
              </button>
              <button className="obtn" onClick={submit} disabled={!canSend}>
                {status === "sending" ? "Envoi…" : "Envoyer"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
