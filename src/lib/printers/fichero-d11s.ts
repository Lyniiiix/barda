import { instantiateClient, LabelType, type FicheroClient } from "@/lib/fichero";
import type { PrinterDriver, PrinterModel } from "./types";

/**
 * Fichero D11s en Web Bluetooth, par le client de `fichero-printer` (voir
 * `src/lib/fichero/NOTICE.md`). La connexion est gardée d'une série à l'autre,
 * et oubliée après une erreur.
 */
let shared: FicheroClient | null = null;

export function ficheroWebBluetooth(model: PrinterModel): PrinterDriver {
  return {
    model,
    transport: "web-bluetooth",

    async connect(onProgress) {
      if (!shared) shared = instantiateClient();
      onProgress("Connexion à l'imprimante…");
      await shared.connect();
      shared.stopHeartbeat();
    },

    async print(raster, { copies, density }) {
      if (!shared) throw new Error("imprimante non connectée");
      const task = shared.abstraction.newPrintTask("B1", {
        totalPages: copies, density, speed: 1, labelType: LabelType.WithGaps,
        statusPollIntervalMs: 100, statusTimeoutMs: 8000,
      });
      await task.printInit();
      await task.printPage({ cols: raster.bytesPerRow, rows: raster.rows, rowsData: raster.data }, copies);
      await task.waitForFinished();
    },

    async end() {
      await shared?.abstraction.printEnd();
    },

    reset() {
      shared = null;
    },
  };
}
