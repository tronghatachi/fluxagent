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
          <footer style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "24px 20px", color: "#8892a4", fontSize: 13 }}>
            <span>Built by @Trong_Hatachi</span>
            <a
              href="https://x.com/Trong_Hatachi"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X (Twitter)"
              style={{ display: "inline-flex", alignItems: "center", color: "#8892a4" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
