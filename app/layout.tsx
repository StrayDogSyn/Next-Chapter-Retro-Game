import type { Metadata, Viewport } from "next";
import "./globals.css";
// eslint-disable-next-line @next/next/no-page-custom-font
import { Press_Start_2P } from "next/font/google";

const pressStart2P = Press_Start_2P({ weight: "400", subsets: ["latin"], variable: "--font-pixel" });

export const metadata: Metadata = {
  title: "Bytefall: Segfault Summit",
  description:
    "A retro action-platformer where you dash, jump, and debug your way up a collapsing codebase.",
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
