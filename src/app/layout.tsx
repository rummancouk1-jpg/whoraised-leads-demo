import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { headers } from "next/headers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://gg-tourney-hub.vercel.app"),
  alternates: { canonical: "https://gg-tourney-hub.vercel.app" },
  title: "GG Outreach",
  description: "Private workspace for the GG team only",
  robots: { index: false, follow: false },
  openGraph: { title: "GG Outreach", description: "Private workspace for the GG team only", type: "website" },
  twitter: { card: "summary_large_image", title: "GG Outreach", description: "Private workspace for the GG team only", images: ["/opengraph-image.png"] },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Request-time rendering lets Next attach this response's CSP nonce to scripts.
  await headers();
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {children}
      </body>
    </html>
  );
}
