import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LayoutWrapper } from "@/components/layout-wrapper"
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
  title: "Langinate - AI-Powered Translation & Interpreting Management",
  description: "Streamline your translation and interpreting business with Langinate. Manage jobs, clients, invoices, and automate workflows with AI-powered job import. Built for professional translators and interpreters.",
  keywords: ["translation management", "interpreting software", "freelance translator tools", "invoice management", "AI job import", "translation CRM"],
  authors: [{ name: "Langinate" }],
  openGraph: {
    title: "Langinate - AI-Powered Translation & Interpreting Management",
    description: "Professional platform for freelance translators and interpreters to manage jobs, clients, and invoices efficiently.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LayoutWrapper>
          {children}
        </LayoutWrapper>
      </body>
    </html>
  );
}
