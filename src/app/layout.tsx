import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  title: { default: "Wedding Budget Planner", template: "%s · Wedding Budget Planner" },
  description: "Susun anggaran pernikahan, pantau pembayaran vendor, dan lacak target tabungan bersama pasangan.",
};

export const viewport: Viewport = {
  themeColor: "#c92d5b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${jakarta.variable} ${playfair.variable}`}>
      <body className="min-h-screen">
        {children}
        <Toaster richColors position="top-center" closeButton />
      </body>
    </html>
  );
}
