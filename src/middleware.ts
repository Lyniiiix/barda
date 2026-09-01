import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, verifyToken } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/login") || pathname.startsWith("/api/print-queue") || pathname.startsWith("/api/mcp")) {
    return NextResponse.next();
  }
  if (await verifyToken(req.cookies.get(COOKIE_NAME)?.value)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Les icônes et le manifeste doivent rester lisibles avant connexion,
  // sinon l'icône de l'écran d'accueil iOS ne se charge jamais.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest).*)"],
};
