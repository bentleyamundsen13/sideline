import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import "./globals.css";
import { AppResume } from "@/components/app-resume";
import { InstallGuide } from "@/components/install-guide";
import { ViewportHeal } from "@/components/viewport-heal";
import { DebugOverlay } from "@/components/debug-overlay";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const barlow = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: { default: "Sideline", template: "%s · Sideline" },
  description: "Run your backyard league like the pros. Teams, drafts, trades, stats and standings.",
  // Opaque status bar: with "black-translucent" the page runs under the clock and
  // iOS blurs that strip, which smeared the top half of our header.
  appleWebApp: { capable: true, title: "Sideline", statusBarStyle: "black" },
  // Next only emits the newer tag; older iOS versions still look for this one.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: "#0a0c10",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the script below adds a class to <html> before React loads.
    <html lang="en" className={`${inter.variable} ${barlow.variable} antialiased`} suppressHydrationWarning>
      <head>
        {/* Mark the installed home-screen app before first paint so the tab bar never jumps. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "if(navigator.standalone===true||matchMedia('(display-mode: standalone)').matches)document.documentElement.classList.add('standalone')",
          }}
        />
      </head>
      <body className="font-sans">
        {children}
        <AppResume />
        <ViewportHeal />
        <InstallGuide />
        <DebugOverlay />
      </body>
    </html>
  );
}
