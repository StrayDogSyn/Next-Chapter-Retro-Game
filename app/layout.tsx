import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Next Chapter Retro Game",
  description: "SNES-styled 2D platformer capstone scaffold",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
