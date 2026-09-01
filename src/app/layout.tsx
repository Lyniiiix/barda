import type { Metadata, Viewport } from "next";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Barda",
  description: "Inventaire du matériel, par lots et par projets",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Barda", statusBarStyle: "black-translucent" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0f1115",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <div className="app">{children}</div>
        <Nav />
      </body>
    </html>
  );
}
