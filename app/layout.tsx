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
  description: "Pilih peran stakeholder untuk melanjutkan ke Zazi Donut.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={arapey.variable}>
      <body>{children}</body>
    </html>
  );
}
