"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { ImageEncoder, instantiateClient, LabelType, type FicheroClient } from "@/lib/fichero";
import { hasNativePrinter, nativeCall, toBase64 } from "@/lib/native";

const W = 240; // 30 mm à 203 dpi
const H = 96;  // 12 mm = largeur de la tête d'impression

let shared: FicheroClient | null = null;

type Props = { code: string; name: string; sub?: string };

function threshold(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = lum < 140 ? 0 : 255;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, maxW: number, start: number, weight = "700") {
  let size = start;
  while (size > 9) {
    ctx.font = `${weight} ${size}px -apple-system, Helvetica, Arial, sans-serif`;
    if (ctx.measureText(text).width <= maxW) break;
    size -= 1;
  }
  return size;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width <= maxW || !cur) cur = test;
    else { lines.push(cur); cur = w; }
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  if (lines.length === maxLines) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(last).width > maxW && last.length > 1) last = last.slice(0, -1);
    lines[maxLines - 1] = last;
  }
  return lines;
}

/** Dessine l'étiquette en paysage 240×96, en noir pur. */
async function drawLandscape(canvas: HTMLCanvasElement, code: string, name: string, sub: string, qrUrlMode: boolean) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, H);

  const payload = qrUrlMode ? `${location.origin}/s/${code}` : code;
  const qr = QRCode.create(payload, { errorCorrectionLevel: qrUrlMode ? "L" : "M" });
  const size = qr.modules.size;
  const data = qr.modules.data;
  const box = 88;
  const scale = Math.max(1, Math.floor(box / size));
  const qrPx = size * scale;
  const ox = 4 + Math.floor((box - qrPx) / 2);
  const oy = Math.floor((H - qrPx) / 2);

  ctx.fillStyle = "#000";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (data[y * size + x]) ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
    }
  }

  const tx = 4 + box + 6;
  const tw = W - tx - 4;

  const nameSize = fitFont(ctx, name, tw, 21);
  ctx.font = `700 ${nameSize}px -apple-system, Helvetica, Arial, sans-serif`;
  const lines = wrap(ctx, name, tw, nameSize > 15 ? 2 : 3);

  const lineH = nameSize + 3;
  const subH = sub ? 15 : 0;
  const codeH = 14;
  let y = Math.max(12, Math.floor((H - (lines.length * lineH + subH + codeH)) / 2) + nameSize);

  ctx.fillStyle = "#000";
  ctx.textBaseline = "alphabetic";
  for (const l of lines) {
    ctx.fillText(l, tx, y);
    y += lineH;
  }
  if (sub) {
    ctx.font = "400 12px -apple-system, Helvetica, Arial, sans-serif";
    ctx.fillText(wrap(ctx, sub, tw, 1)[0] ?? "", tx, y + 2);
    y += subH;
  }
  ctx.font = "400 11px ui-monospace, Menlo, monospace";
  ctx.fillText(code, tx, Math.min(H - 4, y + 2));

  threshold(ctx, W, H);
}

/** Pivote l'étiquette en portrait 96×240, sens de la tête d'impression. */
function toPortrait(src: HTMLCanvasElement, flip: boolean): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = H;
  out.height = W;
  const ctx = out.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, H, W);
  if (flip) {
    ctx.translate(H, 0);
    ctx.rotate(Math.PI / 2);
  } else {
    ctx.translate(0, W);
    ctx.rotate(-Math.PI / 2);
  }
  ctx.drawImage(src, 0, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  threshold(ctx, H, W);
  return out;
}

export default function LabelButton({ code, name, sub = "" }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [copies, setCopies] = useState(1);
  const [flip, setFlip] = useState(false);
  const [urlMode, setUrlMode] = useState(true);
  const [hasBle, setHasBle] = useState(false);
  const [native, setNative] = useState(false);

  useEffect(() => {
    setNative(hasNativePrinter());
    setHasBle(typeof navigator !== "undefined" && "bluetooth" in navigator);
    setFlip(localStorage.getItem("barda.flip") === "1");
    setUrlMode(localStorage.getItem("barda.qrCode") !== "1");
  }, []);

  const redraw = useCallback(async () => {
    if (ref.current) await drawLandscape(ref.current, code, name, sub, urlMode);
  }, [code, name, sub, urlMode]);

  useEffect(() => { void redraw(); }, [redraw]);

  /** Dans l'app iOS, c'est Swift qui parle à l'imprimante : Safari n'a pas de Bluetooth. */
  const printNative = async () => {
    setBusy(true);
    setMsg("Envoi à l'imprimante…");
    const encoded = ImageEncoder.encodeCanvas(toPortrait(ref.current!, flip), "top");
    const res = await nativeCall({
      action: "print",
      rows: encoded.rows,
      raster: toBase64(encoded.rowsData),
      copies,
      density: 2,
    });
    setMsg(res.ok ? "Imprimé ✓" : `Échec : ${res.message}`);
    setBusy(false);
  };

  const print = async () => {
    setBusy(true);
    setMsg("Connexion à l'imprimante…");
    try {
      if (!shared) shared = instantiateClient();
      await shared.connect();
      shared.stopHeartbeat();
      const portrait = toPortrait(ref.current!, flip);
      const task = shared.abstraction.newPrintTask("B1", {
        totalPages: copies, density: 2, speed: 1, labelType: LabelType.WithGaps,
        statusPollIntervalMs: 100, statusTimeoutMs: 8000,
      });
      setMsg("Impression…");
      await task.printInit();
      await task.printPage(ImageEncoder.encodeCanvas(portrait, "top"), copies);
      await task.waitForFinished();
      await shared.abstraction.printEnd();
      setMsg("Imprimé ✓");
    } catch (e) {
      shared = null;
      setMsg(`Échec : ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const queue = async () => {
    setBusy(true);
    setMsg("Envoi dans la file…");
    try {
      const png = toPortrait(ref.current!, flip).toDataURL("image/png");
      const r = await fetch("/api/print-queue", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label: `${code} ${name}`, png, copies }),
      });
      setMsg(r.ok ? "Dans la file ✓ — le Mac imprimera au prochain relevé" : "Échec de la mise en file");
    } catch (e) {
      setMsg(`Échec : ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const toggleFlip = () => {
    const v = !flip;
    setFlip(v);
    localStorage.setItem("barda.flip", v ? "1" : "0");
  };
  const toggleUrl = () => {
    const v = !urlMode;
    setUrlMode(v);
    localStorage.setItem("barda.qrCode", v ? "0" : "1");
  };

  return (
    <div className="card">
      <div className="card-sub" style={{ marginBottom: 8 }}>Étiquette</div>
      <div className="center">
        <div className="label-preview"><canvas ref={ref} width={W} height={H} /></div>
      </div>

      <div className="row wrap" style={{ marginTop: 10 }}>
        <button className="btn sm" onClick={() => setCopies(Math.max(1, copies - 1))}>−</button>
        <span className="small muted">{copies} ex.</span>
        <button className="btn sm" onClick={() => setCopies(copies + 1)}>＋</button>
        <button className="btn sm" onClick={toggleFlip}>{flip ? "Sens B" : "Sens A"}</button>
        <button className="btn sm" onClick={toggleUrl}>{urlMode ? "QR lien" : "QR code seul"}</button>
      </div>

      <div className="row" style={{ marginTop: 10 }}>
        {(native || hasBle) && (
          <button className="btn primary wide" onClick={native ? printNative : print} disabled={busy}>
            {busy ? "…" : "🖨 Imprimer"}
          </button>
        )}
        <button className="btn wide" onClick={queue} disabled={busy}>File d&apos;impression</button>
      </div>

      {!native && !hasBle && (
        <p className="small muted" style={{ marginTop: 8 }}>
          Ce navigateur n&apos;expose pas le Bluetooth. Sur iPhone, ouvrir Barda dans <b>Bluefy</b> pour
          imprimer directement, sinon passer par la file (le Mac imprime).
        </p>
      )}
      {msg && <p className="small" style={{ marginTop: 8 }}>{msg}</p>}
    </div>
  );
}
