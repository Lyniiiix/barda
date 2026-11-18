"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";

/** Une action refusée (la démo est en lecture seule) ou une vraie erreur : jamais un écran blanc. */
export default function Erreur({ reset }: { error: Error; reset: () => void }) {
  const demo = typeof document !== "undefined" && document.documentElement.dataset.demo === "1";
  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <div className="empty">
        <TriangleAlert size={28} strokeWidth={1.75} aria-hidden />
        <b style={{ color: "var(--fg)" }}>{demo ? "Cette démo est en lecture seule" : "Ça n'a pas abouti"}</b>
        <span>
          {demo
            ? "Rien ne s'enregistre ici : installe Barda chez toi pour l'utiliser pour de vrai."
            : "Réessaie. Si ça recommence, le journal du serveur dit pourquoi."}
        </span>
        <div className="row" style={{ marginTop: 6 }}>
          <button className="btn sm" onClick={reset}>Réessayer</button>
          <Link className="btn sm primary" href="/">Accueil</Link>
        </div>
      </div>
    </div>
  );
}
