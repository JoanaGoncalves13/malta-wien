import "./globals.css";
import { Bricolage_Grotesque } from "next/font/google";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";

const font = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font" });

export const metadata = {
  title: "Let's go to Vienna?",
  description: "Split bills and track spending with your Erasmus crew in Vienna",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Let's go to Vienna?" },
};

export const viewport = {
  themeColor: "#d81e2c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={font.variable}>
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
