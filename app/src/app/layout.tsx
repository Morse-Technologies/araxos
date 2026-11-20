import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { PREFS_SCRIPT } from "@/lib/prefs";
import { Providers } from "./providers";
import "./globals.css";

const plex = IBM_Plex_Sans({ variable: "--font-plex", subsets: ["latin", "latin-ext"], weight: ["400", "500", "600"] });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin", "latin-ext"], weight: ["400", "500"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f4f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0c10" },
  ],
};

export const metadata: Metadata = {
  title: { default: "Araxos Field", template: "%s · Field" },
  description: "Hablas al salir de la visita y tu sistema queda actualizado.",
  icons: { icon: "/field-icon.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${plex.variable} ${plexMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFS_SCRIPT }} />
      </head>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
