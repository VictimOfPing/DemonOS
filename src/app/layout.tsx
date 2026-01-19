import type { Metadata } from "next";
import "@/styles/globals.css";
import { APP_NAME, APP_VERSION } from "@/lib/constants";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: `${APP_NAME} ${APP_VERSION} | Data Extraction System`,
  description: "Advanced web scraping control center with Apify integration",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen bg-demon-bg text-demon-text overflow-hidden">
        <ToastProvider>
          {children}
        </ToastProvider>
        {/* Subtle vignette effect */}
        <div className="vignette" aria-hidden="true" />
      </body>
    </html>
  );
}
