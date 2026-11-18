"use client";

import QRCode from "qrcode";
import {
  activePrinter, driverFor, encodeRaster, labelDots, printerPath, type PrinterPath,
} from "@/lib/printers";

/** Rendu et impression d'étiquettes — partagé par la fiche d'un objet et la file. */

/** L'imprimante pour laquelle on dessine : ses dimensions fixent celles de l'étiquette. */
const MODEL = activePrinter();
const SIZE = labelDots(MODEL);

export const W = SIZE.length; // D11s : 240 = 30 mm à 203 dpi
export const H = SIZE.width;  // D11s : 96 = 12 mm, toute la largeur de la tête

/**
 * Le gabarit a été réglé à l'œil sur 96 points de haut. Une étiquette plus
 * haute ou plus basse garde les mêmes proportions ; sur la D11s, k = 1 et rien
 * ne bouge au pixel près.
 */
const k = H / 96;
const px = (n: number) => Math.max(1, Math.round(n * k));

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

  // Mesuré : le code nu tient en 21×21 modules là où l'adresse en demande 25.
  // Sur 90 px de haut, cela fait 4 px par module au lieu de 3 (+32 %), ET permet
  // la correction Q (25 % de récupération) au lieu de L (7 %). Un QR plié ou
  // sali passe encore. L'adresse reste possible : elle seule ouvre la fiche
  // depuis l'appareil photo d'iOS, mais elle coûte cette robustesse.
  const payload = qrUrlMode ? `${location.host}/s/${code}` : code;
  const qr = QRCode.create(payload, { errorCorrectionLevel: qrUrlMode ? "L" : "Q" });
  const size = qr.modules.size;
  const data = qr.modules.data;

  // Le QR prend toute la hauteur utile : sur une étiquette de 12 mm, chaque
  // pixel de module gagné compte quand le support est plié ou sali.
  const MARGIN = px(6);           // marge gauche : sans elle on imprime dans le bord
  const box = H - px(6);          // 90 px sur 96
  const scale = Math.max(1, Math.floor(box / size));
  const qrPx = size * scale;
  const ox = MARGIN + Math.floor((box - qrPx) / 2);
  const oy = Math.floor((H - qrPx) / 2);

  ctx.fillStyle = "#000";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (data[y * size + x]) ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
    }
  }

  const tx = MARGIN + box + px(7);
  const tw = W - tx - px(5);

  // Ordre de priorité tenu à la lettre : le QR a déjà pris sa place, le code
  // réserve la sienne, et le libellé se contente de ce qui reste — quitte à
  // rétrécir ou à être coupé. C'est le seul des trois qu'on peut sacrifier.
  const codeSize = px(17);
  const subSize = sub ? px(12) : 0;
  const gap = px(2);
  const reserve = codeSize + px(3) + (subSize ? subSize + gap : 0);
  const dispo = H - reserve - px(6);

  let nameSize = fitFont(ctx, name, tw, px(22));
  let lines = wrap(ctx, name, tw, 3);
  // On réduit tant que le libellé déborde de la place laissée par les deux autres.
  while (nameSize > 9 && lines.length * (nameSize + gap) > dispo) {
    nameSize -= 1;
    ctx.font = `700 ${nameSize}px -apple-system, Helvetica, Arial, sans-serif`;
    lines = wrap(ctx, name, tw, Math.max(1, Math.floor(dispo / (nameSize + gap))));
  }

  const lineH = nameSize + gap;
  const bloc = lines.length * lineH + reserve;
  let y = Math.max(nameSize, Math.floor((H - bloc) / 2) + nameSize);

  ctx.fillStyle = "#000";
  ctx.textBaseline = "alphabetic";
  ctx.font = `700 ${nameSize}px -apple-system, Helvetica, Arial, sans-serif`;
  for (const l of lines) {
    ctx.fillText(l, tx, y);
    y += lineH;
  }
  if (sub) {
    ctx.font = `400 ${subSize}px -apple-system, Helvetica, Arial, sans-serif`;
    ctx.fillText(wrap(ctx, sub, tw, 1)[0] ?? "", tx, y);
    y += subSize + gap;
  }
  ctx.font = `700 ${codeSize}px ui-monospace, Menlo, monospace`;
  ctx.fillText(code, tx, Math.min(H - gap, y + codeSize - px(3)));

  threshold(ctx, W, H);
}

/** Pivote vers le sens de la tête d'impression : H points de large, W de long. */
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

/** Le chemin d'impression disponible ici pour l'imprimante active. */
export function printerKind(): PrinterPath {
  return printerPath(MODEL);
}

/** Nom de l'imprimante active, pour les messages. */
export const printerName = MODEL.name;

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
  const path = printerKind();

  if (path === "aucun") return { done, error: "Ce navigateur ne peut pas parler à l'imprimante." };

  const driver = driverFor(MODEL, path);
  try {
    await driver.connect((m) => onProgress(m, []));

    for (const [i, job] of jobs.entries()) {
      onProgress(`${job.label} (${i + 1}/${jobs.length})`, [...done]);
      await driver.print(encodeRaster(job.canvas, MODEL), {
        copies: job.copies, density: MODEL.density.default,
      });
      done.push(job.id);
      onProgress(`${job.label} ✓`, [...done]);
    }
    await driver.end();
    return { done };
  } catch (e) {
    driver.reset();
    return { done, error: e instanceof Error ? e.message : String(e) };
  }
}
