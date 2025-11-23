import type { Metadata } from "next";
import { Space_Grotesk, Ubuntu, Ubuntu_Mono } from "next/font/google";
import "./globals.css";
import "@mysten/dapp-kit/dist/index.css";
import { WalletProviders } from "@/components/WalletProviders";
import { Navbar } from "@/components/Navbar";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const ubuntu = Ubuntu({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

const ubuntuMono = Ubuntu_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Storarc - Decentralized Storage",
  description: "Secure decentralized storage powered by Sui",
  icons: {
    icon: "/storarc.jpeg",
    shortcut: "/storarc.jpeg",
    apple: "/storarc.jpeg",
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
        className={`${spaceGrotesk.variable} ${ubuntu.variable} ${ubuntuMono.variable} antialiased`}
      >
        <WalletProviders>
          <Navbar />
          {children}
        </WalletProviders>
      </body>
    </html>
  );
}
