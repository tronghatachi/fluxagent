"use client";

import { usePrivy } from "@privy-io/react-auth";

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  return local.slice(0, 3) + "*****@" + domain;
}

export function ConnectWallet() {
  const { ready, authenticated, login, logout, user } = usePrivy();

  if (!ready) return null;

  if (!authenticated) {
    return (
      <div className="card" style={{ textAlign: "center" }}>
        <p style={{ color: "#8892a4", fontSize: 14, marginBottom: 16 }}>
          Sign in to use FluxAgent
        </p>
        <button className="btn" onClick={login}>
          Sign in with email
        </button>
      </div>
    );
  }

  const email = user?.email?.address;

  return (
    <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <div style={{ fontSize: 13, color: "#8892a4", fontWeight: 600 }}>
        {email ? maskEmail(email) : "Connected"}
      </div>
      <button className="btn btn-secondary btn-sm" onClick={logout}>Sign out</button>
    </div>
  );
}
