import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "FluxAgent",
  description: "Your AI Crypto Agent on Arc Testnet",
  icons: { icon: "/Logo.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <nav className="navbar">
            <Link href="/" className="navbar-brand" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Image src="/Logo.png" alt="FluxAgent" width={28} height={28} style={{ borderRadius: 6 }} />
              FluxAgent
            </Link>
            <div className="navbar-links">
              <Link href="/chat">Chat</Link>
              <Link href="/faucet">Faucet</Link>
            </div>
          </nav>
          {children}
        </Providers>
      </body>
    </html>
  );
}
