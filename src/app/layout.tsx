import type { Metadata } from "next";
import Link from "next/link";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "FluxAgent",
  description: "Your AI Crypto Agent on Arc Testnet",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <nav className="navbar">
            <Link href="/" className="navbar-brand">FluxAgent</Link>
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
