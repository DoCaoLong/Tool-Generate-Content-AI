import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import AppProviders from "@/components/AppProviders";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Content Studio",
  description: "Workspace tạo và quản lý nội dung theo từng dự án.",
  icons: {
    icon: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className={inter.variable}><AppProviders>{children}</AppProviders></body>
    </html>
  );
}
