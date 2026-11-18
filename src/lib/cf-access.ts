/**
 * Derrière Cloudflare Access, vérifie le jeton que Cloudflare ajoute à chaque requête
 * (`Cf-Access-Jwt-Assertion`) quand `BARDA_CF_ACCESS_TEAM` et `BARDA_CF_ACCESS_AUD` sont posés.
 *
 * Sans cette vérification, Access se contourne en visant directement l'IP de l'origine
 * avec le bon nom d'hôte : la requête n'est jamais passée par Cloudflare, et l'app ne le
 * saurait pas. Ici, une requête sans jeton signé par l'équipe Access, pour cette
 * application précise (`aud`), est refusée.
 */
const TEAM = process.env.BARDA_CF_ACCESS_TEAM ?? "";
const AUD = process.env.BARDA_CF_ACCESS_AUD ?? "";
const ISSUER = `https://${TEAM}.cloudflareaccess.com`;

export const CF_ACCESS = TEAM !== "" && AUD !== "";

type Jwk = JsonWebKey & { kid: string };
let cache: { at: number; keys: Map<string, CryptoKey> } | null = null;

/** Les clés publiques de l'équipe, gardées une heure ; rechargées si une clé inconnue arrive. */
async function publicKeys(force = false): Promise<Map<string, CryptoKey>> {
  if (!force && cache && Date.now() - cache.at < 3_600_000) return cache.keys;
  const res = await fetch(`${ISSUER}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error(`certs Access : HTTP ${res.status}`);
  const { keys } = (await res.json()) as { keys: Jwk[] };
  const map = new Map<string, CryptoKey>();
  for (const k of keys) {
    map.set(k.kid, await crypto.subtle.importKey(
      "jwk", k, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"],
    ));
  }
  cache = { at: Date.now(), keys: map };
  return map;
}

function base64url(s: string): ArrayBuffer {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "="));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

const json = (part: string) => JSON.parse(new TextDecoder().decode(base64url(part)));

export async function verifyAccessJwt(token: string | null | undefined): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  try {
    const header = json(parts[0]) as { alg?: string; kid?: string };
    const claims = json(parts[1]) as { aud?: string | string[]; iss?: string; exp?: number; nbf?: number };
    if (header.alg !== "RS256" || !header.kid) return false;

    const now = Date.now() / 1000;
    if (typeof claims.exp !== "number" || claims.exp < now) return false;
    if (typeof claims.nbf === "number" && claims.nbf > now + 60) return false;
    if (claims.iss !== ISSUER) return false;
    const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!aud.includes(AUD)) return false;

    let key = (await publicKeys()).get(header.kid);
    if (!key) key = (await publicKeys(true)).get(header.kid); // rotation des clés côté Cloudflare
    if (!key) return false;

    return await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5", key, base64url(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    );
  } catch {
    return false;
  }
}
