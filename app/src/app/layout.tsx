import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const plex = IBM_Plex_Sans({
  variable: "--font-plex",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "700"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // lets env(safe-area-inset-*) carry the notch and home-bar insets
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f4f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0e0d" },
  ],
};

export const metadata: Metadata = {
  title: { default: "Araxos", template: "%s | Araxos" },
  description: "Guided maintenance for industrial plants: cases, approved procedures, evidence and double-signed lockout.",
  icons: { icon: "/araxos-icon.svg" },
};

// Applies the saved theme before first paint so there is no flash.
// Also restores this station's density and plant contrast (§23.11), so a panel PC never flashes office density.
const themeScript = `try{var d=document.documentElement,t=localStorage.getItem("araxos-theme");if(t==="dark"||t==="light")d.dataset.theme=t;var s=JSON.parse(localStorage.getItem("araxos-station")||"{}");d.dataset.density=s.density||"office";if(s.plant)d.dataset.contrast="plant"}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={plex.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
