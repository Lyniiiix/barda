"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ClipboardPaste, Link2, Sparkles } from "lucide-react";

const MAX_SIDE = 1024;

type Suggestion = {
  titre: string; image: string; source: string;
  credit?: string; telechargement?: string;
};

/**
 * Quatre façons d'obtenir une image, de la plus fiable à la moins fiable :
 * l'appareil photo, le collage (la vraie photo du produit, copiée depuis la
 * page marchande), une adresse, et enfin des suggestions Wikipédia — qui sont
 * des propositions à valider à l'œil, jamais appliquées toutes seules.
 */
export default function PhotoPicker({
  code, name, hasPhoto,
}: { code: string; name: string; hasPhoto: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [panel, setPanel] = useState<"none" | "url" | "suggest">("none");
  const [url, setUrl] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);

  const done = (ok: boolean, text: string) => {
    setMsg(text);
    setBusy(false);
    if (ok) { setPanel("none"); router.refresh(); }
  };

  const send = async (body: Record<string, string | undefined>, label: string) => {
    setBusy(true);
    setMsg(label);
    try {
      const res = await fetch(`/api/photo/${code}`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "échec");
      done(true, "");
    } catch (e) {
      done(false, `Échec : ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  /** Réduit avant l'envoi : on ne fait pas transiter 4 Mo depuis un téléphone en 4G. */
  const fromFile = async (file: File | Blob) => {
    setBusy(true);
    setMsg("Réduction…");
    try {
      const bitmap = await createImageBitmap(file);
      const ratio = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * ratio);
      canvas.height = Math.round(bitmap.height * ratio);
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      await send({ photo: canvas.toDataURL("image/jpeg", 0.75) }, "Envoi…");
    } catch (e) {
      done(false, `Échec : ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      if (input.current) input.current.value = "";
    }
  };

  /** Le chemin le plus sûr pour un vrai produit : copier l'image sur la page marchande. */
  const paste = async () => {
    setMsg("");
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith("image/"));
        if (type) { await fromFile(await item.getType(type)); return; }
        if (item.types.includes("text/plain")) {
          const text = (await (await item.getType("text/plain")).text()).trim();
          if (/^https?:\/\//.test(text)) { await send({ url: text }, "Récupération…"); return; }
        }
      }
      setMsg("Rien d’exploitable dans le presse-papiers : copie l’image, pas la page.");
    } catch {
      setMsg("Le presse-papiers est refusé ici. Utilise « Adresse » ou l’appareil photo.");
    }
  };

  const search = async () => {
    setPanel("suggest");
    setSuggestions(null);
    const res = await fetch(`/api/photo-suggest?q=${encodeURIComponent(name)}`);
    const data = await res.json().catch(() => ({ suggestions: [] }));
    setSuggestions(data.suggestions ?? []);
  };

  return (
    <div>
      <input ref={input} type="file" accept="image/*" capture="environment" hidden
             onChange={(e) => { const f = e.target.files?.[0]; if (f) void fromFile(f); }} />

      <div className="row wrap">
        <button className="btn sm" onClick={() => input.current?.click()} disabled={busy}>
          <Camera size={15} aria-hidden />{hasPhoto ? "Changer" : "Photo"}
        </button>
        <button className="btn sm" onClick={paste} disabled={busy}><ClipboardPaste size={15} aria-hidden />Coller</button>
        <button className="btn sm" onClick={() => setPanel(panel === "url" ? "none" : "url")}><Link2 size={15} aria-hidden />Adresse</button>
        <button className="btn sm" onClick={search} disabled={busy}><Sparkles size={15} aria-hidden />Suggérer</button>
      </div>

      {panel === "url" && (
        <div className="row" style={{ marginTop: 8 }}>
          <input
            className="input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…/image.jpg"
            style={{ flex: 1, padding: "8px 11px" }}
          />
          <button className="btn sm primary" disabled={busy || !url}
                  onClick={() => send({ url }, "Récupération…")}>OK</button>
        </div>
      )}

      {panel === "suggest" && (
        <div style={{ marginTop: 8 }}>
          {suggestions === null && <p className="small muted">Recherche…</p>}
          {suggestions?.length === 0 && (
            <p className="small muted">
              Rien de convaincant pour « {name} ». C’est fréquent sur une référence précise :
              copie l’image depuis la page du vendeur.
            </p>
          )}
          {suggestions && suggestions.length > 0 && (
            <>
              <p className="small muted" style={{ marginTop: 0 }}>
                <b>À vérifier à l’œil</b> : Unsplash donne du générique joli, Wikipédia du juste
                mais parfois à côté de la plaque sur le vocabulaire technique.
              </p>
              <div className="row wrap">
                {suggestions.map((s) => (
                  <button key={s.image} className="suggestion" disabled={busy}
                          onClick={() => send(
                            { url: s.image, credit: s.credit, telechargement: s.telechargement },
                            "Récupération…",
                          )}>
                    <img src={s.image} alt={s.titre} />
                    <span className="small">{s.titre.slice(0, 40)}</span>
                    <span className="small muted">{s.source}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {msg && <p className="small" style={{ marginTop: 8 }}>{msg}</p>}
    </div>
  );
}
