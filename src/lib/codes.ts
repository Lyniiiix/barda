// Fonctions pures : ce module est importé aussi bien côté serveur que dans le navigateur.

// Crockford-ish : ni I, ni L, ni O, ni U — illisibles ou confondus à la relecture.
export const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export type Kind = "item" | "lot" | "project";
export const PREFIX: Record<Kind, string> = { item: "I", lot: "L", project: "P" };

export function randomCode(kind: Kind, len = 5): string {
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  return PREFIX[kind] + Array.from(buf, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function kindOf(code: string): Kind | null {
  const c = code.trim().toUpperCase();
  if (!/^[ILP][0-9A-Z]{5}$/.test(c)) return null;
  if (c[0] === "I") return "item";
  if (c[0] === "L") return "lot";
  return "project";
}

/**
 * Extrait un code Barda d'un QR : soit le code nu, soit une URL .../s/<code>.
 * Renvoie null si le QR scanné vient d'ailleurs (code-barres produit, etc.).
 */
export function parseScan(raw: string): string | null {
  const text = raw.trim();
  const direct = text.toUpperCase();
  if (kindOf(direct)) return direct;
  const m = text.match(/\/s\/([A-Za-z0-9]{6})\b/);
  if (m) {
    const code = m[1].toUpperCase();
    if (kindOf(code)) return code;
  }
  return null;
}
