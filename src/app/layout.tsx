import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Content Builder",
  description: "Modern UX/UI content prompt builder with dark mode"
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
