"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Tags } from "lucide-react";
import { drawLandscape, toPortrait } from "@/lib/label";
import { queueLabel } from "@/lib/print-actions";

type Item = { code: string; name: string; sub: string; printed: boolean };

/**
 * Étiqueter toute une sélection d'un coup : une commande reçue, un lot neuf. Chaque
 * étiquette est rendue ici, comme depuis sa fiche, puis rangée dans la file. Rien ne
 * sort de l'imprimante : on imprime ensuite depuis la page Impression.
 */
export default function LabelBatch({ items }: { items: Item[] }) {
  const missing = items.filter((i) => !i.printed);
  const [onlyMissing, setOnlyMissing] = useState(missing.length > 0);
  const [state, setState] = useState<"prêt" | "en cours" | "fait">("prêt");
  const [done, setDone] = useState(0);
  const [error, setError] = useState("");

  const todo = onlyMissing ? missing : items;

  const run = async () => {
    setState("en cours");
    setDone(0);
    setError("");
    const flip = localStorage.getItem("barda.flip") === "1";
    const urlMode = localStorage.getItem("barda.qrLien") === "1";
    const canvas = document.createElement("canvas");
    try {
      for (const it of todo) {
        await drawLandscape(canvas, it.code, it.name, it.sub, urlMode);
        const png = toPortrait(canvas, flip).toDataURL("image/png");
        await queueLabel(it.code, it.name, png, 1, "file");
        setDone((n) => n + 1);
      }
      setState("fait");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState("prêt");
    }
  };

  return (
    <div className="card accent" style={{ marginBottom: 16 }}>
      <div className="row wrap" style={{ gap: 12 }}>
        <Tags size={20} strokeWidth={1.9} aria-hidden />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="card-title">Étiqueter ces {items.length} objets</div>
          <div className="card-sub">
            {missing.length === items.length
              ? "Aucun n'a encore d'étiquette."
              : `${items.length - missing.length} déjà imprimé${items.length - missing.length > 1 ? "s" : ""}, ${missing.length} sans étiquette.`}
          </div>
        </div>
        {state === "fait" ? (
          <Link className="btn primary" href="/impression"><Check size={17} strokeWidth={2.4} aria-hidden />Voir la file</Link>
        ) : (
          <button className="btn primary" onClick={run} disabled={state === "en cours" || todo.length === 0}>
            {state === "en cours" ? `Préparation… ${done}/${todo.length}` : `Ajouter ${todo.length} étiquette${todo.length > 1 ? "s" : ""} à la file`}
          </button>
        )}
      </div>
      {missing.length > 0 && missing.length < items.length && state === "prêt" && (
        <label className="checkline" style={{ borderBottom: 0, paddingBottom: 0 }}>
          <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />
          <span className="small">Seulement celles qui n&apos;ont jamais été imprimées</span>
        </label>
      )}
      {state === "fait" && (
        <p className="small muted" style={{ marginBottom: 0 }}>
          {done} étiquette{done > 1 ? "s" : ""} dans la file. Rien n&apos;est sorti : imprime-les depuis la page Impression.
        </p>
      )}
      {error && <p className="small" style={{ color: "var(--bad)", marginBottom: 0 }}>Échec : {error}</p>}
    </div>
  );
}
