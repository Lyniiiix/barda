"use client";

import QRCode from "qrcode";
import { ImageEncoder, instantiateClient, LabelType, type FicheroClient } from "@/lib/fichero";
import { hasNativePrinter, nativeCall, toBase64 } from "@/lib/native";

/** Rendu et impression d'étiquettes — partagé par la fiche d'un objet et la file. */

export const W = 240; // 30 mm à 203 dpi
export const H = 96;  // 12 mm = largeur de la tête d'impression

let shared: FicheroClient | null = null;

/** Le codeur ne retient que le noir pur : tout gris d'anticrénelage serait perdu. */
export function threshold(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2] < 140 ? 0 : 255;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, maxW: number, start: number) {
  let size = start;
  while (size > 9) {
    ctx.font = `700 ${size}px -apple-system, Helvetica, Arial, sans-serif`;
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

export async function drawLandscape(
  canvas: HTMLCanvasElement, code: string, name: string, sub: string, qrUrlMode: boolean,
) {
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
  let y = Math.max(12, Math.floor((H - (lines.length * lineH + subH + 14)) / 2) + nameSize);

  ctx.fillStyle = "#000";
  ctx.textBaseline = "alphabetic";
  for (const l of lines) { ctx.fillText(l, tx, y); y += lineH; }
  if (sub) {
    ctx.font = "400 12px -apple-system, Helvetica, Arial, sans-serif";
    ctx.fillText(wrap(ctx, sub, tw, 1)[0] ?? "", tx, y + 2);
    y += subH;
  }
  ctx.font = "400 11px ui-monospace, Menlo, monospace";
  ctx.fillText(code, tx, Math.min(H - 4, y + 2));

  threshold(ctx, W, H);
}

/** Pivote vers le sens de la tête d'impression : 96 px de large, 240 de long. */
export function toPortrait(src: HTMLCanvasElement, flip: boolean): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = H;
  out.height = W;
  const ctx = out.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, H, W);
  if (flip) { ctx.translate(H, 0); ctx.rotate(Math.PI / 2); }
  else { ctx.translate(0, W); ctx.rotate(-Math.PI / 2); }
  ctx.drawImage(src, 0, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  threshold(ctx, H, W);
  return out;
}

/** Relit un PNG de la file pour en refaire une trame imprimable. */
export function canvasFromPng(dataUrl: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = H;
      c.height = W;
      const ctx = c.getContext("2d", { willReadFrequently: true })!;
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, H, W);
      ctx.drawImage(img, 0, 0, H, W);
      threshold(ctx, H, W);
      resolve(c);
    };
    img.onerror = () => reject(new Error("PNG illisible"));
    img.src = dataUrl;
  });
}

export type PrintJob = { id: number; label: string; canvas: HTMLCanvasElement; copies: number };
export type PrintOutcome = { done: number[]; error?: string };

export function printerKind(): "native" | "bluetooth" | "aucun" {
  if (hasNativePrinter()) return "native";
  if (typeof navigator !== "undefined" && "bluetooth" in navigator) return "bluetooth";
  return "aucun";
}

/**
 * Imprime une série d'étiquettes. La connexion n'est ouverte qu'une fois pour
 * tout le lot, et chaque étiquette réussie est signalée au fur et à mesure :
 * une coupure en milieu de série ne fait pas tout réimprimer.
 */
export async function printJobs(
  jobs: PrintJob[],
  onProgress: (message: string, doneIds: number[]) => void,
): Promise<PrintOutcome> {
  const done: number[] = [];
  const kind = printerKind();

  if (kind === "aucun") return { done, error: "Ce navigateur ne peut pas parler à l'imprimante." };

  if (kind === "native") {
    for (const [i, job] of jobs.entries()) {
      onProgress(`${job.label} (${i + 1}/${jobs.length})`, [...done]);
      const encoded = ImageEncoder.encodeCanvas(job.canvas, "top");
      const res = await nativeCall({
        action: "print", rows: encoded.rows, raster: toBase64(encoded.rowsData),
        copies: job.copies, density: 2,
      });
      if (!res.ok) return { done, error: res.message };
      done.push(job.id);
      onProgress(`${job.label} ✓`, [...done]);
    }
    return { done };
  }

  try {
    if (!shared) shared = instantiateClient();
    onProgress("Connexion à l'imprimante…", []);
    await shared.connect();
    shared.stopHeartbeat();

    for (const [i, job] of jobs.entries()) {
      onProgress(`${job.label} (${i + 1}/${jobs.length})`, [...done]);
      const task = shared.abstraction.newPrintTask("B1", {
        totalPages: job.copies, density: 2, speed: 1, labelType: LabelType.WithGaps,
        statusPollIntervalMs: 100, statusTimeoutMs: 8000,
      });
      await task.printInit();
      await task.printPage(ImageEncoder.encodeCanvas(job.canvas, "top"), job.copies);
      await task.waitForFinished();
      done.push(job.id);
      onProgress(`${job.label} ✓`, [...done]);
    }
    await shared.abstraction.printEnd();
    return { done };
  } catch (e) {
    shared = null;
    return { done, error: e instanceof Error ? e.message : String(e) };
  }
}
