import type { Metadata, Viewport } from "next";
import "./globals.css";
// eslint-disable-next-line @next/next/no-page-custom-font
import { Press_Start_2P } from "next/font/google";

const pressStart2P = Press_Start_2P({ weight: "400", subsets: ["latin"], variable: "--font-pixel" });

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
  title: "RetroVania | Rogue-like Platformer",
  description:
    "A retro rogue-like platformer where you dash, jump, and battle through a hostile pixel world.",
  icons: {
    icon: `${basePath}/assets/branding/favicon-straydog.png`,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={pressStart2P.variable}>
      <body>{children}</body>
    </html>
  );
}
