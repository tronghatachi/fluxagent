"use client";

import { useWallets } from "@privy-io/react-auth";
import { ConnectWallet } from "@/components/ConnectWallet";
import Link from "next/link";

export default function FaucetPage() {
  const { wallets } = useWallets();
  const address = wallets[0]?.address;

  const copy = () => {
    if (address) navigator.clipboard.writeText(address);
  };

  return (
    <main>
      <h1>Faucet</h1>
      <nav className="nav">
        <Link href="/">Home</Link>
        <Link href="/chat">Chat</Link>
      </nav>

      <ConnectWallet />

      <div className="card">
        <h3>Step 1: Copy your wallet address</h3>
        {address ? (
          <div>
            <code>{address}</code>
            <div>
              <button className="btn" onClick={copy}>
                Copy
              </button>
            </div>
          </div>
        ) : (
          <p>Connect your wallet first.</p>
        )}
      </div>

      <div className="card">
        <h3>Step 2: Open the Circle Faucet</h3>
        <p>
          Go to{" "}
          <a href="https://faucet.circle.com" target="_blank" rel="noreferrer">
            faucet.circle.com
          </a>
        </p>
      </div>

      <div className="card">
        <h3>Step 3: Request tokens</h3>
        <ol>
          <li>Paste your wallet address.</li>
          <li>
            Select network: <strong>Arc Testnet</strong>
          </li>
          <li>Choose a token: USDC, EURC, or cirBTC</li>
          <li>Click &quot;Request&quot;</li>
        </ol>
        <p>You can request again every 2 hours.</p>
      </div>
    </main>
  );
}
