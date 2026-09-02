"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const MAX_SIDE = 1024;

/**
 * Prend une photo, la réduit dans le navigateur, puis l'envoie. Le
 * redimensionnement côté client évite d'envoyer 4 Mo depuis un téléphone en 4G.
 */
export default function PhotoButton({ code, hasPhoto }: { code: string; hasPhoto: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const onPick = async (file: File) => {
    setBusy(true);
    setMsg("Réduction…");
    try {
      const bitmap = await createImageBitmap(file);
      const ratio = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * ratio);
      canvas.height = Math.round(bitmap.height * ratio);
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.75);

      setMsg("Envoi…");
      const res = await fetch(`/api/photo/${code}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ photo: dataUrl }),
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

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void onPick(f); }}
      />
      <button className="btn sm" onClick={() => input.current?.click()} disabled={busy}>
        {busy ? "…" : hasPhoto ? "Changer la photo" : "📷 Photo"}
      </button>
      {msg && <span className="small muted">{msg}</span>}
    </>
  );
}
