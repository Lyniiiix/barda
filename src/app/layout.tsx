import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import Nav from "@/components/Nav";
import Signature from "@/components/Signature";
import DemoBanner from "@/components/DemoBanner";
import { DEMO } from "@/lib/demo";
import "./globals.css";

// Les trois polices de la Suite, servies par l'app elle-même (next/font les télécharge au build).
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const serif = Source_Serif_4({ subsets: ["latin"], weight: ["700"], variable: "--font-serif4", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["500"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Barda", template: "%s · Barda" },
  description: "Inventaire du matériel, par lots et par projets, avec étiquettes QR",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Barda", statusBarStyle: "black-translucent" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1120" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${serif.variable} ${mono.variable}`}
          data-demo={DEMO ? "1" : undefined}>
      <body>
        <div className="shell">
          <Nav />
          <main className="main">
            <div className="page">
              <DemoBanner />
              {children}
              <Signature />
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
