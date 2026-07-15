import "./globals.css";
import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Content Builder",
  description: "Modern UX/UI content prompt builder with dark mode",
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
    <html lang="en" className="dark" suppressHydrationWarning>
      <body>
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            try {
              var savedTheme = localStorage.getItem("cwui_theme");
              var root = document.documentElement;
              if (savedTheme === "light") {
                root.classList.remove("dark");
              } else {
                root.classList.add("dark");
              }
            } catch (e) {}
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}
