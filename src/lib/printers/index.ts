import { hasNativePrinter } from "@/lib/native";
import { ficheroWebBluetooth } from "./fichero-d11s";
import { nativeBridge } from "./native";
import type { PrinterDriver, PrinterModel } from "./types";

export * from "./types";
export * from "./models";
export { encodeRaster } from "./raster";

/**
 * Pilotes Web Bluetooth, par identifiant de modèle. Un modèle absent d'ici ne
 * s'imprime pas depuis Chrome, mais peut encore passer par l'app iOS ou le relais.
 */
const WEB_BLUETOOTH: Record<string, (model: PrinterModel) => PrinterDriver> = {
  "fichero-d11s": ficheroWebBluetooth,
};

export type PrinterPath = "native" | "bluetooth" | "aucun";

/** Le chemin que ce navigateur peut prendre vers ce modèle, du plus sûr au plus fragile. */
export function printerPath(model: PrinterModel): PrinterPath {
  if (model.transports.includes("native") && hasNativePrinter()) return "native";
  if (
    model.transports.includes("web-bluetooth") && WEB_BLUETOOTH[model.id] &&
    typeof navigator !== "undefined" && "bluetooth" in navigator
  ) return "bluetooth";
  return "aucun";
}

export function driverFor(model: PrinterModel, path: Exclude<PrinterPath, "aucun">): PrinterDriver {
  if (path === "native") return nativeBridge(model);
  const make = WEB_BLUETOOTH[model.id];
  if (!make) throw new Error(`${model.name} ne s'imprime pas depuis ce navigateur.`);
  return make(model);
}
