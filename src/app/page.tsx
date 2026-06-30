import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="page">
      {/* Hero */}
      <div className="card" style={{ textAlign: "center", padding: "40px 24px 36px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 20 }}>
          <Image src="/Logo.png" alt="FluxAgent" width={56} height={56} style={{ borderRadius: 14 }} />
          <h1 style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>
            <span style={{ color: "#fff" }}>Flux</span><span style={{ color: "#a78bfa" }}>Agent</span>
          </h1>
        </div>
        <div style={{ display: "inline-block", background: "#161d2e", border: "1px solid #1e2740", borderRadius: 20, padding: "4px 14px", fontSize: 12, color: "#8892a4", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 20 }}>
          AI · DeFi · Arc Testnet
        </div>
        <p style={{ color: "#8892a4", fontSize: 16, maxWidth: 400, margin: "0 auto 28px", lineHeight: 1.6 }}>
          Your AI-powered crypto agent. Swap, transfer, and manage stablecoins on Arc Testnet — just chat.
        </p>
        <Link href="/chat">
          <button className="btn" style={{ fontSize: 15, padding: "13px 32px" }}>
            Start chatting →
          </button>
        </Link>
      </div>

      {/* Feature grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        {[
          { icon: "⚡", title: "Instant Swap", desc: "Swap USDC ↔ EURC with one message" },
          { icon: "📤", title: "Transfer", desc: "Send tokens to any address by chat" },
          { icon: "📊", title: "Live Rate", desc: "Real-time USDC/EURC exchange rate" },
          { icon: "🕒", title: "History", desc: "View your recent transactions" },
        ].map((f) => (
          <div key={f.title} className="card" style={{ marginBottom: 0, textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{f.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{f.title}</div>
            <div style={{ fontSize: 13, color: "#8892a4" }}>{f.desc}</div>
          </div>
        ))}
      </div>

      {/* Steps */}
      <div className="card">
        <h3 style={{ marginBottom: 16, fontSize: 15, fontWeight: 700 }}>Get started in 3 steps</h3>
        {[
          { n: 1, title: "Sign in", desc: <>Connect with your email via <strong>Privy</strong></> },
          { n: 2, title: "Get testnet tokens", desc: <>Visit the <Link href="/faucet">Faucet</Link> to get USDC &amp; EURC</> },
          { n: 3, title: "Chat", desc: <>Type <em style={{ color: "#a78bfa" }}>"Swap 1 USDC to EURC"</em> and FluxAgent handles the rest</> },
        ].map((s) => (
          <div key={s.n} style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: s.n < 3 ? 16 : 0 }}>
            <div style={{ minWidth: 28, height: 28, borderRadius: "50%", background: "#4f7cff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: "#fff", flexShrink: 0 }}>
              {s.n}
            </div>
            <div style={{ paddingTop: 4, fontSize: 14 }}>
              <strong>{s.title}</strong> — {s.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
