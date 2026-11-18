import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, verifyToken } from "@/lib/auth";
import { DEMO } from "@/lib/demo";
import { CF_ACCESS, verifyAccessJwt } from "@/lib/cf-access";

const refus = (message: string) =>
  NextResponse.json({ error: message }, { status: 403, headers: { "x-barda-demo": "1" } });

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (DEMO) {
    // Pas d'accès machine sur la démo : ni MCP, ni relais d'impression, ni API tierce.
    if (pathname.startsWith("/api/mcp") || pathname.startsWith("/api/print-queue")
        || pathname.startsWith("/api/photo-suggest")) {
      return refus("Indisponible sur la démo publique.");
    }
    // Toute écriture passe par une méthode autre que GET : formulaires, actions serveur,
    // envoi de photo ou de PDF. Un seul verrou les couvre toutes.
    if (req.method !== "GET" && req.method !== "HEAD") {
      return refus("Démo en lecture seule.");
    }
    if (pathname.startsWith("/login")) return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }

  // Sonde de santé du conteneur : appelée en local, elle ne révèle rien.
  if (pathname === "/api/sante") return NextResponse.next();

  // Les deux accès machine ont leur propre jeton, vérifié par leur route.
  const machine = pathname.startsWith("/api/print-queue") || pathname.startsWith("/api/mcp");

  // Derrière Cloudflare Access : tout le reste exige un jeton Access valide, même la page
  // de connexion. C'est ce qui ferme l'accès direct par l'IP de l'origine.
  if (CF_ACCESS && !machine && !(await verifyAccessJwt(req.headers.get("cf-access-jwt-assertion")))) {
    return new NextResponse("Accès réservé : passe par Cloudflare Access.", {
      status: 403, headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  if (pathname.startsWith("/login") || machine) return NextResponse.next();
  if (await verifyToken(req.cookies.get(COOKIE_NAME)?.value)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Les icônes, le manifeste et la signature doivent rester lisibles avant connexion,
  // sinon l'icône de l'écran d'accueil iOS ne se charge jamais.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|cansys.svg).*)"],
};
