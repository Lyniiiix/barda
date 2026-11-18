"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";

/**
 * Sur la démo, un formulaire envoyé serait refusé par le serveur (le vrai verrou est le
 * middleware). On l'arrête avant, pour dire pourquoi au lieu d'échouer sans un mot.
 */
export default function DemoGuard() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const stop = (e: Event) => {
      const form = e.target as HTMLFormElement | null;
      // La recherche est un GET vers une page : elle reste libre. Une action serveur, elle,
      // n'a pas d'adresse de page dans `action`.
      const action = form?.getAttribute("action") ?? "";
      if (form?.method?.toLowerCase() === "get" && action.startsWith("/")) return;
      e.preventDefault();
      e.stopPropagation();
      setShown(true);
      clearTimeout(timer);
      timer = setTimeout(() => setShown(false), 3200);
    };
    document.addEventListener("submit", stop, true);
    return () => { document.removeEventListener("submit", stop, true); clearTimeout(timer); };
  }, []);

  if (!shown) return null;
  return (
    <div className="toast glass" role="status" onClick={() => setShown(false)}>
      <div className="row small">
        <Lock size={16} strokeWidth={2} aria-hidden />
        Démo en lecture seule : cette action ne s&apos;enregistre pas.
      </div>
    </div>
  );
}
