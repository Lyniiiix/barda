"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House, Package, Printer, ScanQrCode, Settings, ShoppingCart, Target, Wrench, type LucideIcon,
} from "lucide-react";
import Wordmark from "./Wordmark";

type Tab = { href: string; Icon: LucideIcon; label: string };

const MAIN: Tab[] = [
  { href: "/", Icon: House, label: "Accueil" },
  { href: "/objets", Icon: Wrench, label: "Objets" },
  { href: "/lots", Icon: Package, label: "Lots" },
  { href: "/projets", Icon: Target, label: "Projets" },
  { href: "/scan", Icon: ScanQrCode, label: "Scanner" },
];

const TOOLS: Tab[] = [
  { href: "/courses", Icon: ShoppingCart, label: "À racheter" },
  { href: "/impression", Icon: Printer, label: "Impression" },
  { href: "/reglages", Icon: Settings, label: "Réglages" },
];

/**
 * Deux formes pour la même navigation : une barre latérale sur grand écran, une
 * barre d'onglets flottante en verre sur téléphone, à portée de pouce.
 */
export default function Nav() {
  const path = usePathname() || "/";
  if (path.startsWith("/login")) return null;
  const on = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <>
      <aside className="sidebar" aria-label="Navigation">
        <Link href="/" className="brand" aria-label="Accueil Barda">
          <img src="/icon.svg" alt="" width={34} height={34} style={{ borderRadius: 9 }} />
          <Wordmark size={26} />
        </Link>
        {MAIN.map(({ href, Icon, label }) => (
          <Link key={href} href={href} className={`nav-item ${on(href) ? "on" : ""}`}>
            <Icon size={19} strokeWidth={1.9} aria-hidden />
            {label}
          </Link>
        ))}
        <div className="group">Outils</div>
        {TOOLS.map(({ href, Icon, label }) => (
          <Link key={href} href={href} className={`nav-item ${on(href) ? "on" : ""}`}>
            <Icon size={19} strokeWidth={1.9} aria-hidden />
            {label}
          </Link>
        ))}
        <div className="grow" />
      </aside>

      <nav className="tabbar glass" aria-label="Navigation">
        {MAIN.map(({ href, Icon, label }) => (
          <Link key={href} href={href} className={on(href) ? "on" : ""}>
            <Icon size={22} strokeWidth={on(href) ? 2.2 : 1.8} aria-hidden />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
