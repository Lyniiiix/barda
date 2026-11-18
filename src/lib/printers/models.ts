import type { LabelSize, PrinterModel } from "./types";

/**
 * Les imprimantes que Barda sait piloter. Une seule pour l'instant.
 *
 * Ce fichier ne contient que des faits sur le matériel, sans aucun code qui
 * touche au Bluetooth : il peut être lu partout, y compris côté serveur.
 */
export const PRINTERS = {
  "fichero-d11s": {
    id: "fichero-d11s",
    name: "Fichero D11s",
    dpi: 203,
    headDots: 96,           // 12 mm
    bytesPerRow: 12,
    labels: [{ id: "12x30", widthMm: 12, lengthMm: 30 }],
    defaultLabel: "12x30",
    density: { min: 0, max: 2, default: 2 },
    transports: ["web-bluetooth", "native", "relay"],
    bluetoothNames: ["FICHERO", "D11s_"],
  },
} satisfies Record<string, PrinterModel>;

export type PrinterId = keyof typeof PRINTERS;

export const DEFAULT_PRINTER_ID: PrinterId = "fichero-d11s";

export function getPrinter(id: string): PrinterModel | undefined {
  return (PRINTERS as Record<string, PrinterModel>)[id];
}

/**
 * L'imprimante utilisée. Constante tant qu'il n'y en a qu'une ; le jour où il y
 * en aura plusieurs, c'est ici qu'on lira le réglage (et nulle part ailleurs).
 */
export function activePrinter(): PrinterModel {
  return PRINTERS[DEFAULT_PRINTER_ID];
}

/** Millimètres vers points, à la résolution du modèle. */
export function dots(mm: number, dpi: number): number {
  return Math.round((mm / 25.4) * dpi);
}

export function labelSize(model: PrinterModel, id = model.defaultLabel): LabelSize {
  return model.labels.find((l) => l.id === id) ?? model.labels[0];
}

/**
 * Taille de l'étiquette rendue, en points, posée à plat :
 * `length` dans le sens d'avance du papier, `width` dans le sens de la tête.
 */
export function labelDots(model: PrinterModel, id?: string): { length: number; width: number } {
  const l = labelSize(model, id);
  return {
    length: dots(l.lengthMm, model.dpi),
    width: Math.min(model.headDots, dots(l.widthMm, model.dpi)),
  };
}
