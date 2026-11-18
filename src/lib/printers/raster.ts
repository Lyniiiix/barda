import type { PrinterModel, Raster } from "./types";

/**
 * Trame une étiquette déjà posée dans le sens de la tête (largeur ≤ tête) :
 * 1 bit par point, noir pur = 1. Le canevas doit avoir été seuillé avant, tout
 * gris serait compté comme blanc.
 */
export function encodeRaster(canvas: HTMLCanvasElement, model: PrinterModel): Raster {
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const rows = canvas.height;
  const bytesPerRow = model.bytesPerRow;
  const data = new Uint8Array(rows * bytesPerRow);

  for (let y = 0; y < rows; y++) {
    for (let b = 0; b < bytesPerRow; b++) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit++) {
        const x = b * 8 + bit;
        if (x < canvas.width && px[(y * canvas.width + x) * 4] === 0) byte |= 0x80 >> bit;
      }
      data[y * bytesPerRow + b] = byte;
    }
  }
  return { rows, bytesPerRow, data };
}
