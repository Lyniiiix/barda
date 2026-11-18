"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Check, ChevronLeft, ChevronRight, FlipVertical2, Minus, Plus, Printer, QrCode, Send, Tag,
} from "lucide-react";
import {
  W, H, OFFSET_STEP_MM, drawLandscape, readingOffsetMm, setReadingOffsetMm, storedFlip, toPortrait,
  printJobs, printerKind,
} from "@/lib/label";
import { queueLabel } from "@/lib/print-actions";

type Props = { code: string; name: string; sub?: string; lastPrinted?: string | null };

export default function LabelButton({ code, name, sub = "", lastPrinted = null }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [copies, setCopies] = useState(1);
  const [flip, setFlip] = useState(false);
  const [urlMode, setUrlMode] = useState(false);
  const [kind, setKind] = useState<"native" | "bluetooth" | "aucun">("aucun");
  const [basket, setBasket] = useState<number | null>(null);
  const [offset, setOffset] = useState<number | null>(null); // calage lu sur l'étiquette, en mm

  useEffect(() => {
    setKind(printerKind());
    setFlip(storedFlip());
    setUrlMode(localStorage.getItem("barda.qrLien") === "1");
  }, []);

  // Le calage se lit dans le sens choisi : changer de sens le retourne aussi.
  useEffect(() => { setOffset(readingOffsetMm(flip)); }, [flip]);

  const nudge = (deltaMm: number) => {
    setReadingOffsetMm((offset ?? 0) + deltaMm, flip);
    setOffset(readingOffsetMm(flip));
  };

  const redraw = useCallback(async () => {
    if (ref.current && offset !== null) await drawLandscape(ref.current, code, name, sub, urlMode, offset);
  }, [code, name, sub, urlMode, offset]);

  useEffect(() => { void redraw(); }, [redraw]);

  /** Chemin normal : on remplit le panier, on imprime tout en une fois plus tard. */
  const addToBasket = async (target: "file" | "relais") => {
    setBusy(true);
    try {
      const png = toPortrait(ref.current!, flip).toDataURL("image/png");
      const r = await queueLabel(code, name, png, copies, target);
      setBasket(r.total);
      setMsg(
        target === "relais"
          ? "Confiée au Mac — elle sortira au prochain relevé du relais."
          : r.deja
            ? `Déjà dans la file (${r.total} étiquette${r.total > 1 ? "s" : ""} au total).`
            : `Ajoutée à la file — ${r.total} étiquette${r.total > 1 ? "s" : ""} en attente.`,
      );
    } catch (e) {
      setMsg(`Échec : ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  /** Raccourci quand on n'a qu'une étiquette à sortir, imprimante sous la main. */
  const printNow = async () => {
    setBusy(true);
    const canvas = toPortrait(ref.current!, flip);
    const res = await printJobs([{ id: 0, label: name, canvas, copies }], (m) => setMsg(m));
    setMsg(res.error ? `Échec : ${res.error}` : "Imprimé.");
    setBusy(false);
  };

  const toggle = (key: string, value: boolean, set: (v: boolean) => void) => {
    set(value);
    localStorage.setItem(key, value ? "1" : "0");
  };

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 12 }}>
        <span className="section-title" style={{ margin: 0 }}><Tag size={14} aria-hidden />Étiquette</span>
        {lastPrinted && (
          <span className="chip ok" style={{ marginLeft: "auto" }}>
            <Check size={13} strokeWidth={2.4} aria-hidden />imprimée le {new Date(lastPrinted).toLocaleDateString("fr-FR")}
          </span>
        )}
      </div>

      <div className="center" style={{ padding: "10px 0 4px" }}>
        <div className="label-preview"><canvas ref={ref} width={W} height={H} /></div>
      </div>

      <div className="row wrap" style={{ marginTop: 14, justifyContent: "center" }}>
        <button className="btn sm icon" aria-label="Un exemplaire de moins" onClick={() => setCopies(Math.max(1, copies - 1))}><Minus size={15} aria-hidden /></button>
        <span className="small" style={{ minWidth: 44, textAlign: "center", fontWeight: 550 }}>{copies} ex.</span>
        <button className="btn sm icon" aria-label="Un exemplaire de plus" onClick={() => setCopies(Math.min(20, copies + 1))}><Plus size={15} aria-hidden /></button>
        <button className="btn sm" onClick={() => toggle("barda.flip", !flip, setFlip)}>
          <FlipVertical2 size={15} aria-hidden />{flip ? "Sens B" : "Sens A"}
        </button>
        <button className="btn sm" onClick={() => toggle("barda.qrLien", !urlMode, setUrlMode)}>
          <QrCode size={15} aria-hidden />{urlMode ? "QR lien (plus fragile)" : "QR robuste"}
        </button>
      </div>

      {/* Calage : si l'imprimante coupe un bord, on décale tout le contenu. */}
      <div className="row" style={{ marginTop: 8, justifyContent: "center", gap: 6 }}>
        <button className="btn sm icon" aria-label="Décaler vers la gauche" onClick={() => nudge(-OFFSET_STEP_MM)}>
          <ChevronLeft size={16} aria-hidden />
        </button>
        <span className="small" style={{ minWidth: 112, textAlign: "center" }}>
          calage {offset === null ? "…" : `${offset > 0 ? "+" : ""}${offset.toLocaleString("fr-FR")} mm`}
        </span>
        <button className="btn sm icon" aria-label="Décaler vers la droite" onClick={() => nudge(OFFSET_STEP_MM)}>
          <ChevronRight size={16} aria-hidden />
        </button>
      </div>

      <button className="btn primary wide" onClick={() => addToBasket("file")} disabled={busy}
              style={{ marginTop: 14 }}>
        {busy ? "…" : <><Plus size={18} strokeWidth={2.2} aria-hidden />Ajouter à la file</>}
      </button>

      <div className="row" style={{ marginTop: 8 }}>
        {kind !== "aucun" && (
          <button className="btn wide" onClick={printNow} disabled={busy}><Printer size={16} aria-hidden />Imprimer maintenant</button>
        )}
        <button className="btn wide" onClick={() => addToBasket("relais")} disabled={busy}>
          <Send size={16} aria-hidden />Envoyer au Mac
        </button>
      </div>

      {msg && (
        <p className="small" style={{ marginTop: 8 }}>
          {msg}{" "}
          {basket !== null && (
            <Link href="/impression" style={{ color: "var(--accent)" }}>voir la file</Link>
          )}
        </p>
      )}
      {kind === "aucun" && !msg && (
        <p className="small muted" style={{ marginTop: 8 }}>
          Ce navigateur ne peut pas parler à l&apos;imprimante : passer par la file, puis imprimer
          depuis l&apos;app iPhone, ou confier au Mac.
        </p>
      )}
    </div>
  );
}
