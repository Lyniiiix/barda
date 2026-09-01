import { redirect } from "next/navigation";
import { kindOf } from "@/lib/codes";

export const dynamic = "force-dynamic";

/** Cible des QR : /s/<code> — redirige vers la bonne fiche. */
export default async function Resolve({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const c = code.toUpperCase();
  switch (kindOf(c)) {
    case "item": redirect(`/objets/${c}`);
    case "lot": redirect(`/lots/${c}`);
    case "project": redirect(`/projets/${c}`);
    default: redirect(`/objets?q=${encodeURIComponent(code)}`);
  }
}
