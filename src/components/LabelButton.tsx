"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { W, H, drawLandscape, toPortrait, printJobs, printerKind } from "@/lib/label";
import { queueLabel } from "@/lib/print-actions";

type Props = { code: string; name: string; sub?: string; lastPrinted?: string | null };

export default function LabelButton({ code, name, sub = "", lastPrinted = null }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [copies, setCopies] = useState(1);
  const [flip, setFlip] = useState(false);
  const [urlMode, setUrlMode] = useState(true);
  const [kind, setKind] = useState<"native" | "bluetooth" | "aucun">("aucun");
  const [basket, setBasket] = useState<number | null>(null);

  useEffect(() => {
    setKind(printerKind());
    setFlip(localStorage.getItem("barda.flip") === "1");
    setUrlMode(localStorage.getItem("barda.qrCode") !== "1");
  }, []);

  const redraw = useCallback(async () => {
    if (ref.current) await drawLandscape(ref.current, code, name, sub, urlMode);
  }, [code, name, sub, urlMode]);

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
    setMsg(res.error ? `Échec : ${res.error}` : "Imprimé ✓");
    setBusy(false);
  };

  const toggle = (key: string, value: boolean, set: (v: boolean) => void) => {
    set(value);
    localStorage.setItem(key, value ? "1" : "0");
  };

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 8 }}>
        <span className="card-sub">Étiquette</span>
        {lastPrinted && (
          <span className="chip" style={{ marginLeft: "auto" }}>
            déjà imprimée le {new Date(lastPrinted).toLocaleDateString("fr-FR")}
          </span>
        )}
      </div>

      <div className="center">
        <div className="label-preview"><canvas ref={ref} width={W} height={H} /></div>
      </div>

      <div className="row wrap" style={{ marginTop: 10 }}>
        <button className="btn sm" onClick={() => setCopies(Math.max(1, copies - 1))}>−</button>
        <span className="small muted">{copies} ex.</span>
        <button className="btn sm" onClick={() => setCopies(Math.min(20, copies + 1))}>＋</button>
        <button className="btn sm" onClick={() => toggle("barda.flip", !flip, setFlip)}>
          {flip ? "Sens B" : "Sens A"}
        </button>
        <button className="btn sm" onClick={() => toggle("barda.qrCode", urlMode, () => setUrlMode(!urlMode))}>
          {urlMode ? "QR lien" : "QR code seul"}
        </button>
      </div>

      <button className="btn primary wide" onClick={() => addToBasket("file")} disabled={busy}
              style={{ marginTop: 10 }}>
        {busy ? "…" : "＋ Ajouter à la file"}
      </button>

      <div className="row" style={{ marginTop: 8 }}>
        {kind !== "aucun" && (
          <button className="btn wide" onClick={printNow} disabled={busy}>Imprimer maintenant</button>
        )}
        <button className="btn wide" onClick={() => addToBasket("relais")} disabled={busy}>
          Envoyer au Mac
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
