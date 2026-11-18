import { nativeCall, toBase64 } from "@/lib/native";
import type { PrinterDriver, PrinterModel } from "./types";

/**
 * L'app iOS imprime pour la page. Le pilote est le même pour tous les modèles :
 * il transmet la trame et l'identifiant, et c'est l'app qui choisit le code qui
 * parle à l'imprimante (`Printers.swift` dans `barda-ios`).
 */
export function nativeBridge(model: PrinterModel): PrinterDriver {
  return {
    model,
    transport: "native",
    async connect() { /* l'app se connecte elle-même à la première étiquette */ },
    async print(raster, { copies, density }) {
      const res = await nativeCall({
        action: "print", printer: model.id,
        rows: raster.rows, bytesPerRow: raster.bytesPerRow, raster: toBase64(raster.data),
        copies, density,
      });
      if (!res.ok) throw new Error(res.message);
    },
    async end() {},
    reset() {},
  };
}
