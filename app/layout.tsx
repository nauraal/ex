import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const arapey = localFont({
  src: "../public/zazi/arapey-regular.ttf",
  variable: "--font-arapey",
  weight: "400",
});

export const metadata: Metadata = {
  title: "Zazi Donut",
  description: "Sistem Informasi Produksi dan Distribusi Zazi Donut.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={arapey.variable}>
      <body>{children}</body>
    </html>
  );
}
