"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", ic: "🏠", label: "Accueil" },
  { href: "/objets", ic: "🧰", label: "Objets" },
  { href: "/lots", ic: "📦", label: "Lots" },
  { href: "/projets", ic: "🎯", label: "Projets" },
  { href: "/scan", ic: "📷", label: "Scan" },
];

export default function Nav() {
  const path = usePathname() || "/";
  if (path.startsWith("/login")) return null;

  return (
    <nav className="nav">
      {TABS.map((t) => {
        const on = t.href === "/" ? path === "/" : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={on ? "on" : ""}>
            <span className="ic">{t.ic}</span>
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
