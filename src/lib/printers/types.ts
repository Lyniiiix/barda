/**
 * Ce qu'il faut savoir d'une imprimante pour en faire une étiquette Barda.
 *
 * Deux choses distinctes : le **modèle** (des faits sur le matériel, sans code,
 * lisibles partout, serveur compris) et le **pilote** (le code qui lui parle,
 * côté navigateur ou côté app iOS). Ajouter une imprimante, c'est décrire son
 * modèle ici, puis écrire un pilote pour au moins un transport.
 */

/** Comment l'étiquette atteint l'imprimante. */
export type Transport =
  /** Chrome, Edge ou Opera parlent directement à l'imprimante. */
  | "web-bluetooth"
  /** L'app iOS `barda-ios` imprime pour la page (Safari n'a pas Web Bluetooth). */
  | "native"
  /** Le relais `npm run spool`, sur un Mac ou un PC, imprime ce qu'on lui confie. */
  | "relay";

/** Un format d'étiquette accepté par le modèle. */
export type LabelSize = {
  id: string;
  /** Dans le sens de la tête d'impression : c'est la hauteur de l'étiquette rendue. */
  widthMm: number;
  /** Dans le sens d'avance du papier. */
  lengthMm: number;
};

export type PrinterModel = {
  /** Identifiant stable : envoyé au pont iOS et au relais, il ne doit plus changer. */
  id: string;
  /** Nom affiché. */
  name: string;
  /** Résolution de la tête, en points par pouce. */
  dpi: number;
  /** Largeur de la tête, en points : aucune étiquette ne peut la dépasser. */
  headDots: number;
  /** Octets par ligne de trame envoyée (en général `headDots / 8`). */
  bytesPerRow: number;
  labels: LabelSize[];
  defaultLabel: string;
  density: { min: number; max: number; default: number };
  transports: Transport[];
  /** Préfixes du nom Bluetooth annoncé, pour reconnaître l'appareil au scan. */
  bluetoothNames?: string[];
};

/** Une étiquette tramée : 1 bit par point, noir = 1, ligne après ligne. */
export type Raster = {
  rows: number;
  bytesPerRow: number;
  data: Uint8Array;
};

export type PrintOptions = { copies: number; density: number };

/** Le code qui parle à une imprimante donnée, sur un transport donné. */
export interface PrinterDriver {
  readonly model: PrinterModel;
  readonly transport: Transport;
  /** Ouvre la connexion une fois pour toute une série. */
  connect(onProgress: (message: string) => void): Promise<void>;
  /** Imprime une étiquette en `copies` exemplaires. Lève une erreur si elle n'est pas sortie. */
  print(raster: Raster, options: PrintOptions): Promise<void>;
  /** Fin de série, une fois toutes les étiquettes sorties. */
  end(): Promise<void>;
  /** Oublie la connexion après une erreur : la prochaine série repartira de zéro. */
  reset(): void;
}
