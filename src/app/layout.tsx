import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import "./globals.css";
import { AppResume } from "@/components/app-resume";
import { InstallGuide } from "@/components/install-guide";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const barlow = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: { default: "Sideline", template: "%s · Sideline" },
  description: "Run your backyard league like the pros. Teams, drafts, trades, stats and standings.",
  appleWebApp: { capable: true, title: "Sideline", statusBarStyle: "black-translucent" },
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
    <html lang="en" className={`${inter.variable} ${barlow.variable} antialiased`}>
      <body className="font-sans">
        {children}
        <AppResume />
        <InstallGuide />
      </body>
    </html>
  );
}
