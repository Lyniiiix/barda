"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { assignItemToLot } from "@/lib/actions";
import { kindOf, parseScan } from "@/lib/codes";

type Lot = { code: string; name: string };
type Toast = { kind: "ok" | "bad" | "info"; text: string; href?: string; hrefLabel?: string };

export default function Scanner({ lots, initialLot }: { lots: Lot[]; initialLot?: string }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const [mode, setMode] = useState<"voir" | "ranger">(initialLot ? "ranger" : "voir");
  const [lot, setLot] = useState(initialLot ?? "");
  const [toast, setToast] = useState<Toast | null>(null);
  const [error, setError] = useState("");
  const [count, setCount] = useState(0);

  // Les handlers changent à chaque rendu ; la caméra, elle, ne doit démarrer qu'une fois.
  const stateRef = useRef({ mode, lot });
  stateRef.current = { mode, lot };

  useEffect(() => {
    let controls: { stop: () => void } | undefined;
    let dead = false;
    const reader = new BrowserMultiFormatReader();

    (async () => {
      try {
        const c = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          videoRef.current!,
          (result) => { if (result) void onScan(result.getText()); },
        );
        if (dead) c.stop();
        else controls = c;
      } catch (e) {
        setError(
          e instanceof Error && /permission|NotAllowed/i.test(e.message)
            ? "Accès caméra refusé. Réglages ▸ Safari ▸ Caméra."
            : `Caméra indisponible : ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    })();

    return () => { dead = true; controls?.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buzz = () => { try { navigator.vibrate?.(40); } catch { /* iOS ignore */ } };

  async function onScan(raw: string) {
    const nowMs = Date.now();
    if (lastRef.current.code === raw && nowMs - lastRef.current.at < 2500) return;
    lastRef.current = { code: raw, at: nowMs };
    buzz();

    const code = parseScan(raw);
    const { mode: m, lot: targetLot } = stateRef.current;

    if (!code) {
      const r = await fetch(`/api/lookup?barcode=${encodeURIComponent(raw)}`).then((x) => x.json());
      if (r.code) { void handleBarda(r.code, m, targetLot); return; }
      setToast({
        kind: "info",
        text: `Code inconnu : ${raw.slice(0, 24)}`,
        href: `/objets/nouveau?barcode=${encodeURIComponent(raw)}${targetLot ? `&lot=${targetLot}` : ""}`,
        hrefLabel: "Créer un objet avec ce code-barres",
      });
      return;
    }
    void handleBarda(code, m, targetLot);
  }

  async function handleBarda(code: string, m: "voir" | "ranger", targetLot: string) {
    const kind = kindOf(code);

    if (kind === "lot" && m === "ranger") {
      setLot(code);
      setToast({ kind: "ok", text: `Lot cible : ${lots.find((l) => l.code === code)?.name ?? code}` });
      return;
    }
    if (m === "voir" || kind !== "item") {
      router.push(`/s/${code}`);
      return;
    }
    if (!targetLot) {
      setToast({ kind: "bad", text: "Choisir d'abord un lot cible." });
      return;
    }
    await assignItemToLot(code, targetLot);
    setCount((c) => c + 1);
    setToast({
      kind: "ok",
      text: `Rangé dans ${lots.find((l) => l.code === targetLot)?.name ?? targetLot}`,
      href: `/objets/${code}`,
      hrefLabel: code,
    });
  }

  return (
    <>
      <div className="row" style={{ marginBottom: 10 }}>
        <button className={`btn sm ${mode === "voir" ? "primary" : ""}`} onClick={() => setMode("voir")}>Consulter</button>
        <button className={`btn sm ${mode === "ranger" ? "primary" : ""}`} onClick={() => setMode("ranger")}>Ranger</button>
        {mode === "ranger" && (
          <select
            value={lot}
            onChange={(e) => setLot(e.target.value)}
            style={{ flex: 1, background: "var(--bg-elev)", border: "1px solid var(--line)", borderRadius: 10, padding: "8px 10px", fontSize: 16 }}
          >
            <option value="">— lot cible —</option>
            {lots.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select>
        )}
      </div>

      {error ? (
        <div className="card" style={{ borderColor: "var(--bad)" }}>
          <div className="small">{error}</div>
          <p className="small muted">La caméra exige HTTPS (ou localhost).</p>
        </div>
      ) : (
        <div className="scanwrap">
          <video ref={videoRef} playsInline muted />
          <div className="reticle" />
        </div>
      )}

      <p className="small muted center" style={{ marginTop: 10 }}>
        {mode === "ranger"
          ? `Scanne les étiquettes à la chaîne. ${count} rangé${count > 1 ? "s" : ""} dans cette session.`
          : "Scanne une étiquette pour ouvrir la fiche."}
      </p>

      {toast && (
        <div className={`toast ${toast.kind}`} onClick={() => setToast(null)}>
          <div className="row">
            <span className="small">{toast.text}</span>
            {toast.href && (
              <a className="btn sm" style={{ marginLeft: "auto" }} href={toast.href}>{toast.hrefLabel}</a>
            )}
          </div>
        </div>
      )}
    </>
  );
}
