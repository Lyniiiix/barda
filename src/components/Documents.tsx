"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Doc } from "@/lib/docs";
import { removeDocument } from "@/lib/actions";

/**
 * Notices, fiches techniques, factures. Un lien ne coûte rien mais ne vaut rien
 * sans réseau ; le fichier, lui, part avec toi. D'où la mise en avant du dépôt.
 */
export default function Documents({ code, docs }: { code: string; docs: Doc[] }) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");

  const upload = async (file: File) => {
    setBusy(true);
    setMsg(`Envoi de ${file.name}…`);
    try {
      const res = await fetch(`/api/doc/${code}`, {
        method: "POST",
        headers: {
          "content-type": file.type || "application/pdf",
          "x-barda-label": encodeURIComponent(file.name),
        },
        body: file,
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "échec");
      setMsg("");
      router.refresh();
    } catch (e) {
      setMsg(`Échec : ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const addLink = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/doc/${code}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, label }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "échec");
      setUrl(""); setLabel(""); setShowLink(false); setMsg("");
      router.refresh();
    } catch (e) {
      setMsg(`Échec : ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const ko = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} Mo` : `${Math.round(n / 1024)} Ko`);

  return (
    <div className="card">
      <div className="card-sub" style={{ marginTop: 0, marginBottom: 8 }}>
        Notices et documents
      </div>

      {docs.length === 0 && (
        <p className="small muted" style={{ marginTop: 0 }}>
          Rien pour l&apos;instant. Un PDF déposé ici reste lisible sans réseau — c&apos;est ce
          qui compte en déplacement.
        </p>
      )}

      {docs.map((d) => (
        <div className="row" key={d.id} style={{ padding: "7px 0", borderBottom: "1px solid var(--line)" }}>
          <span>{d.kind === "fichier" ? "📄" : "🔗"}</span>
          <a
            href={d.kind === "fichier" ? `/api/doc/fichier/${d.id}` : d.url}
            target="_blank"
            rel="noreferrer"
            className="small"
            style={{ color: "var(--accent)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {d.label}
          </a>
          <span className="small muted" style={{ marginLeft: "auto", whiteSpace: "nowrap" }}>
            {d.kind === "fichier" ? ko(d.size) : "lien"}
          </span>
          <form action={removeDocument}>
            <input type="hidden" name="id" value={d.id} />
            <input type="hidden" name="code" value={code} />
            <button className="btn sm danger" type="submit">✕</button>
          </form>
        </div>
      ))}

      <input ref={input} type="file" accept="application/pdf,image/*,text/plain" hidden
             onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />

      <div className="row wrap" style={{ marginTop: 10 }}>
        <button className="btn sm primary" onClick={() => input.current?.click()} disabled={busy}>
          📄 Déposer un PDF
        </button>
        <button className="btn sm" onClick={() => setShowLink(!showLink)}>🔗 Ajouter un lien</button>
      </div>

      {showLink && (
        <div style={{ marginTop: 8 }}>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Notice constructeur"
                 style={{ width: "100%", background: "var(--bg-elev)", border: "1px solid var(--line)",
                          borderRadius: 10, padding: "9px 10px", fontSize: 16, marginBottom: 6 }} />
          <div className="row">
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…"
                   style={{ flex: 1, background: "var(--bg-elev)", border: "1px solid var(--line)",
                            borderRadius: 10, padding: "9px 10px", fontSize: 16 }} />
            <button className="btn sm primary" onClick={addLink} disabled={busy || !url}>OK</button>
          </div>
        </div>
      )}

      {msg && <p className="small" style={{ marginTop: 8 }}>{msg}</p>}
    </div>
  );
}
