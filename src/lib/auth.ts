const COOKIE = "barda_session";
const TTL_DAYS = 365;

const PROD = process.env.NODE_ENV === "production";

function secret(): string {
  const v = process.env.BARDA_SECRET;
  if (!v && PROD) throw new Error("BARDA_SECRET absent");
  return v || "barda-dev-secret";
}

/**
 * En production, pas de mot de passe par défaut : sur un domaine public, un
 * oubli de variable d'environnement ouvrirait l'inventaire à tout le monde.
 */
export function expectedPassword(): string | null {
  const v = process.env.BARDA_PASSWORD;
  if (v) return v;
  return PROD ? null : "barda";
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function makeToken(): Promise<{ name: string; value: string; maxAge: number }> {
  const exp = String(Date.now() + TTL_DAYS * 86400_000);
  return { name: COOKIE, value: `${exp}.${await sign(exp)}`, maxAge: TTL_DAYS * 86400 };
}

export async function verifyToken(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  const [exp, sig] = value.split(".");
  if (!exp || !sig) return false;
  if (Number(exp) < Date.now()) return false;
  return (await sign(exp)) === sig;
}

export const COOKIE_NAME = COOKIE;
