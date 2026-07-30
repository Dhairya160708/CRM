import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { Providers } from "./providers";
import NextTopLoader from "nextjs-toploader";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";

const fontSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const fontMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "MedTrade CRM",
    template: "%s · MedTrade CRM",
  },
  description: "Pharmaceutical raw materials trading CRM",
  applicationName: "MedTrade CRM",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0D1B2A",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${fontSans.variable} ${fontMono.variable}`}>
      <body>
        <NextTopLoader color="#00B4D8" showSpinner={false} height={2} />
        <Providers>
          {children}
          <Toaster
            theme="dark"
            position="top-right"
            toastOptions={{
              style: {
                background: "hsl(214, 30%, 13%)",
                border: "1px solid hsl(214, 25%, 20%)",
                color: "hsl(210, 20%, 92%)",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
