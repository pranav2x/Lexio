import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { QueueProviderWrapper } from "@/components/QueueProviderWrapper";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lexio",
  description: "A modern web application built with Next.js, TypeScript, and Tailwind CSS",
  keywords: ["Next.js", "TypeScript", "Tailwind CSS", "React"],
  authors: [{ name: "Lexio Team" }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}
      >
        <QueueProviderWrapper>
          {children}
        </QueueProviderWrapper>
      </body>
    </html>
  );
}
