"use client";

import { useState, useEffect, useRef } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { createPublicClient, formatUnits, http } from "viem";
import { ConnectWallet } from "@/components/ConnectWallet";
import { arcTestnet } from "@/lib/chains";
import { TOKENS } from "@/lib/tokens";

const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });

const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

type Message = { role: "user" | "assistant"; text: string };

const QUICK_CMDS = [
  "Swap 1 USDC to EURC",
  "Swap 1 USDC to cirBTC",
  "Check my balance",
  "What's the EURC rate?",
  "Transaction history",
  "Send 1 USDC to 0x1234...",
  "DCA 100 USDC to cirBTC over 10 days",
  "Show my DCA plans",
];

export default function ChatPage() {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const privyAddress = wallets[0]?.address as `0x${string}` | undefined;

  const [circleWalletId, setCircleWalletId] = useState<string | null>(null);
  const [circleAddress, setCircleAddress] = useState<string | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);

  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  const [eurcBalance, setEurcBalance] = useState<string | null>(null);
  const [cirbtcBalance, setCirbtcBalance] = useState<string | null>(null);

  const [refCode, setRefCode] = useState<string | null>(null);
  const [points, setPoints] = useState(0);
  const [refCount, setRefCount] = useState(0);
  const [refPoints, setRefPoints] = useState(0);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: 'Hi! I\'m FluxAgent ⚡\n\nTry: "Swap 1 USDC to EURC", "Send 0.5 USDC to 0x...", "Check my balance", "Transaction history", or "What\'s the EURC rate?"',
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Thinking...");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isLoggedIn = !!user;
  const displayAddress = circleAddress ?? privyAddress;

  // Register referral on login
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref") ?? undefined;
    fetch("/api/referral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "register", userId: user.id, referrerCode: ref }),
    })
      .then((r) => r.json())
      .then((d) => { setRefCode(d.refCode); setPoints(d.points); setRefCount(d.refCount); setRefPoints(d.refPoints); })
      .catch(() => {});
  }, [user]);

  const refreshPoints = () => {
    if (!user) return;
    fetch("/api/referral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "info", userId: user.id }),
    })
      .then((r) => r.json())
      .then((d) => { setPoints(d.points); setRefCount(d.refCount); setRefPoints(d.refPoints); })
      .catch(() => {});
  };

  const awardPoint = () => {
    if (!user) return;
    fetch("/api/referral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "award", userId: user.id }),
    })
      .then((r) => r.json())
      .then((d) => { setPoints(d.points); setRefCount(d.refCount); setRefPoints(d.refPoints); })
      .catch(() => {});
  };

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Fetch balances whenever address changes
  useEffect(() => {
    if (!displayAddress) { setUsdcBalance(null); setEurcBalance(null); setCirbtcBalance(null); return; }
    const addr = displayAddress as `0x${string}`;
    publicClient.getBalance({ address: addr })
      .then((r) => setUsdcBalance(parseFloat(formatUnits(r, TOKENS.USDC.decimals)).toFixed(4)))
      .catch(() => setUsdcBalance("—"));
    publicClient.readContract({ address: TOKENS.EURC.address, abi: erc20Abi, functionName: "balanceOf", args: [addr] })
      .then((r) => setEurcBalance(parseFloat(formatUnits(r as bigint, TOKENS.EURC.decimals)).toFixed(4)))
      .catch(() => setEurcBalance("—"));
    publicClient.readContract({ address: TOKENS.cirBTC.address, abi: erc20Abi, functionName: "balanceOf", args: [addr] })
      .then((r) => setCirbtcBalance(parseFloat(formatUnits(r as bigint, TOKENS.cirBTC.decimals)).toFixed(6)))
      .catch(() => setCirbtcBalance("—"));
  }, [displayAddress]);

  const refreshBalances = () => {
    if (!displayAddress) return;
    const addr = displayAddress as `0x${string}`;
    publicClient.getBalance({ address: addr })
      .then((r) => setUsdcBalance(parseFloat(formatUnits(r, TOKENS.USDC.decimals)).toFixed(4)))
      .catch(() => {});
    publicClient.readContract({ address: TOKENS.EURC.address, abi: erc20Abi, functionName: "balanceOf", args: [addr] })
      .then((r) => setEurcBalance(parseFloat(formatUnits(r as bigint, TOKENS.EURC.decimals)).toFixed(4)))
      .catch(() => {});
    publicClient.readContract({ address: TOKENS.cirBTC.address, abi: erc20Abi, functionName: "balanceOf", args: [addr] })
      .then((r) => setCirbtcBalance(parseFloat(formatUnits(r as bigint, TOKENS.cirBTC.decimals)).toFixed(6)))
      .catch(() => {});
  };

  const addMsg = (role: "user" | "assistant", text: string) =>
    setMessages((prev) => [...prev, { role, text }]);

  const ensureCircleWallet = async () => {
    if (circleWalletId) return { walletId: circleWalletId, address: circleAddress! };
    if (!user) throw new Error("Not logged in");
    setWalletLoading(true);
    try {
      const res = await fetch("/api/wallet/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCircleWalletId(data.walletId);
      setCircleAddress(data.address);
      return { walletId: data.walletId, address: data.address };
    } finally {
      setWalletLoading(false);
    }
  };

  const send = async (text?: string) => {
    const userMessage = (text ?? input).trim();
    if (!userMessage) return;
    addMsg("user", userMessage);
    setInput("");
    setLoading(true);
    setLoadingMsg("Thinking...");

    try {
      const res = await fetch("/api/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });
      const data = await res.json();
      addMsg("assistant", data.reply);

      if (data.intent === "balance") {
        if (!displayAddress) { addMsg("assistant", "Please log in first."); return; }
        setLoadingMsg("Fetching balances...");
        const addr = displayAddress as `0x${string}`;
        try {
          const [usdcRaw, eurcRaw, cirbtcRaw] = await Promise.all([
            publicClient.getBalance({ address: addr }),
            publicClient.readContract({ address: TOKENS.EURC.address, abi: erc20Abi, functionName: "balanceOf", args: [addr] }),
            publicClient.readContract({ address: TOKENS.cirBTC.address, abi: erc20Abi, functionName: "balanceOf", args: [addr] }),
          ]);
          const usdc = parseFloat(formatUnits(usdcRaw, TOKENS.USDC.decimals)).toFixed(4);
          const eurc = parseFloat(formatUnits(eurcRaw as bigint, TOKENS.EURC.decimals)).toFixed(4);
          const cirbtc = parseFloat(formatUnits(cirbtcRaw as bigint, TOKENS.cirBTC.decimals)).toFixed(6);
          setUsdcBalance(usdc);
          setEurcBalance(eurc);
          setCirbtcBalance(cirbtc);
          addMsg("assistant", `💰 Balance:\n• USDC: ${usdc}\n• EURC: ${eurc}\n• cirBTC: ${cirbtc}`);
        } catch (err) {
          addMsg("assistant", `Could not fetch balance: ${(err as Error).message}`);
        }
      }

      if (data.intent === "transfer") {
        if (!isLoggedIn) { addMsg("assistant", "Please log in first."); return; }
        setLoadingMsg(`Sending ${data.amount} ${data.token}...`);
        try {
          const { walletId } = await ensureCircleWallet();
          const txRes = await fetch("/api/transfer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ walletId, token: data.token, amount: data.amount, toAddress: data.toAddress }),
          });
          const txData = await txRes.json();
          if (txData.error) throw new Error(txData.error);
          const txHash = txData.txHash ?? "";
          const explorerUrl = txHash ? `https://testnet.arcscan.app/tx/${txHash}` : `Tx ID: ${txData.txId ?? "submitted"}`;
          addMsg("assistant", `✅ Sent ${data.amount} ${data.token} to ${data.toAddress.slice(0, 10)}...\n${explorerUrl}`);
          awardPoint();
          setTimeout(refreshBalances, 4000);
        } catch (err) {
          addMsg("assistant", `Transfer failed: ${(err as Error).message}`);
        }
      }

      if (data.intent === "history") {
        if (!circleWalletId) { addMsg("assistant", "No swap wallet yet. Create one first."); return; }
        setLoadingMsg("Loading history...");
        try {
          const res = await fetch("/api/history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ walletId: circleWalletId }),
          });
          const histData = await res.json();
          if (histData.error) throw new Error(histData.error);
          const txs: any[] = histData.transactions ?? [];
          if (txs.length === 0) {
            addMsg("assistant", "No transactions found.");
          } else {
            const lines = txs.map((tx) => {
              const amt = tx.amounts?.[0] ?? "";
              const date = tx.createDate ? new Date(tx.createDate).toLocaleDateString() : "";
              return `• ${tx.type ?? "TX"} ${amt} — ${tx.state} (${date})`;
            });
            addMsg("assistant", `📋 Last ${txs.length} transactions:\n${lines.join("\n")}`);
          }
        } catch (err) {
          addMsg("assistant", `Could not fetch history: ${(err as Error).message}`);
        }
      }

      if (data.intent === "rate") {
        setLoadingMsg("Fetching rate...");
        try {
          const res = await fetch("/api/rate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fromToken: data.fromToken ?? "USDC", toToken: data.toToken ?? "EURC" }),
          });
          const rateData = await res.json();
          if (rateData.error) throw new Error(rateData.error);
          addMsg("assistant", `📈 Current rate:\n1 ${rateData.fromToken} ≈ ${rateData.rate} ${rateData.toToken}`);
        } catch (err) {
          addMsg("assistant", `Could not fetch rate: ${(err as Error).message}`);
        }
      }

      if (data.intent === "swap") {
        if (!isLoggedIn) { addMsg("assistant", "Please log in first."); return; }
        setLoadingMsg(`Swapping ${data.amount} ${data.fromToken} → ${data.toToken}...`);
        try {
          const { walletId, address: walletAddress } = await ensureCircleWallet();
          const swapRes = await fetch("/api/swap", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ walletId, walletAddress, fromToken: data.fromToken, toToken: data.toToken, amount: data.amount }),
          });
          const swapData = await swapRes.json();
          if (swapData.error) throw new Error(swapData.error);
          addMsg("assistant", `✅ Swap complete!\nTx: ${swapData.explorerUrl ?? swapData.txHash}`);
          awardPoint();
          setTimeout(refreshBalances, 4000);
        } catch (err) {
          addMsg("assistant", `Swap failed: ${(err as Error).message}`);
        }
      }
      if (data.intent === "dca") {
        if (!isLoggedIn) { addMsg("assistant", "Please log in first."); return; }
        setLoadingMsg("Setting up DCA plan...");
        try {
          const { walletId, address: walletAddress } = await ensureCircleWallet();
          const res = await fetch("/api/dca", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "create",
              userId: user!.id,
              walletId,
              walletAddress,
              toToken: "cirBTC",
              totalAmount: data.totalAmount,
              days: data.days,
            }),
          });
          const planData = await res.json();
          if (planData.error) throw new Error(planData.error);
          const p = planData.plan;
          addMsg("assistant", `✅ DCA plan created!\n${p.totalAmount} USDC → cirBTC over ${p.days} days\n~${p.dailyAmount.toFixed(4)} USDC/day, executed automatically once daily.`);
        } catch (err) {
          addMsg("assistant", `DCA setup failed: ${(err as Error).message}`);
        }
      }

      if (data.intent === "dca_status") {
        if (!isLoggedIn) { addMsg("assistant", "Please log in first."); return; }
        setLoadingMsg("Loading DCA plans...");
        try {
          const res = await fetch("/api/dca", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "list", userId: user!.id }),
          });
          const d = await res.json();
          const plans: any[] = d.plans ?? [];
          if (plans.length === 0) {
            addMsg("assistant", "You have no DCA plans yet.");
          } else {
            const lines = plans.map((p) =>
              `• ${p.totalAmount} USDC → cirBTC, ${p.daysExecuted}/${p.days} days done — ${p.status}`
            );
            addMsg("assistant", `📊 Your DCA plans:\n${lines.join("\n")}`);
          }
        } catch (err) {
          addMsg("assistant", `Could not fetch DCA plans: ${(err as Error).message}`);
        }
      }

      if (data.intent === "dca_cancel") {
        if (!isLoggedIn) { addMsg("assistant", "Please log in first."); return; }
        setLoadingMsg("Cancelling DCA plan...");
        try {
          const res = await fetch("/api/dca", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "cancel", userId: user!.id }),
          });
          const d = await res.json();
          if (d.error) throw new Error(d.error);
          addMsg("assistant", d.cancelled > 0 ? `✅ Cancelled ${d.cancelled} active DCA plan(s).` : "No active DCA plans to cancel.");
        } catch (err) {
          addMsg("assistant", `Could not cancel DCA: ${(err as Error).message}`);
        }
      }
    } catch {
      addMsg("assistant", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      {/* Auth */}
      <ConnectWallet />

      {/* Balance chips */}
      {displayAddress && (
        <div className="card" style={{ paddingBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#8892a4", textTransform: "uppercase", letterSpacing: "0.05em" }}>Wallet Balance</span>
            <button className="btn btn-secondary btn-sm" onClick={refreshBalances}>↻ Refresh</button>
          </div>
          <div className="token-row">
            <div className="token-chip">
              <div>
                <div className="symbol">USDC</div>
                <div className="amount">{usdcBalance ?? "—"}</div>
              </div>
            </div>
            <div className="token-chip">
              <div>
                <div className="symbol">EURC</div>
                <div className="amount">{eurcBalance ?? "—"}</div>
              </div>
            </div>
            <div className="token-chip">
              <div>
                <div className="symbol">cirBTC</div>
                <div className="amount">{cirbtcBalance ?? "—"}</div>
              </div>
            </div>
          </div>
          {circleAddress && (
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: "#8892a4", flexShrink: 0 }}>Wallet:</span>
              <span className="address-text" style={{ fontFamily: "monospace", fontSize: 11, userSelect: "all" }}>{circleAddress}</span>
              <button
                className="btn btn-secondary btn-sm"
                style={{ padding: "3px 10px", fontSize: 11 }}
                onClick={() => navigator.clipboard.writeText(circleAddress)}
              >Copy</button>
            </div>
          )}
        </div>
      )}

      {/* Referral & Points */}
      {isLoggedIn && refCode && (
        <div className="card" style={{ paddingBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#8892a4", textTransform: "uppercase", letterSpacing: "0.05em" }}>Referral & Points</span>
            <button className="btn btn-secondary btn-sm" onClick={refreshPoints}>↻</button>
          </div>
          <div className="token-row">
            <div className="token-chip">
              <div>
                <div className="symbol">Points</div>
                <div className="amount">{points}</div>
              </div>
            </div>
            <div className="token-chip">
              <div>
                <div className="symbol">Referrals</div>
                <div className="amount">{refCount}</div>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: "#8892a4" }}>
            Ref points: {refPoints}/1000
          </div>
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "#8892a4", flexShrink: 0 }}>Invite link:</span>
            <span className="address-text" style={{ fontFamily: "monospace", fontSize: 11, userSelect: "all", wordBreak: "break-all" }}>
              {typeof window !== "undefined" ? `${window.location.origin}/chat?ref=${refCode}` : ""}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              style={{ padding: "3px 10px", fontSize: 11 }}
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/chat?ref=${refCode}`)}
            >Copy</button>
          </div>
        </div>
      )}

      {/* Wallet setup */}
      {isLoggedIn && !circleAddress && (
        <div className="card" style={{ textAlign: "center" }}>
          <p style={{ color: "#8892a4", fontSize: 14, marginBottom: 12 }}>Create a swap wallet to use Swap &amp; Transfer</p>
          <button className="btn" onClick={ensureCircleWallet} disabled={walletLoading}>
            {walletLoading ? "Creating..." : "⚡ Create swap wallet"}
          </button>
        </div>
      )}

      {/* Chat */}
      <div className="card" style={{ padding: "16px" }}>
        {/* Quick commands — always visible */}
        <div className="quick-cmds">
          {QUICK_CMDS.map((cmd) => (
            <button key={cmd} className="quick-cmd" onClick={() => send(cmd)}>{cmd}</button>
          ))}
        </div>

        <div className="messages">
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>
              <div className="msg-label">{m.role === "user" ? "You" : "FluxAgent"}</div>
              <div className="msg-bubble">{m.text}</div>
            </div>
          ))}
          {loading && (
            <div className="typing">
              <div className="dot-pulse"><span /><span /><span /></div>
              <span>{loadingMsg}</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ marginTop: 12 }}>
          <div className="chat-input-row">
            <textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Swap 1 USDC to EURC..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
              }}
            />
            <button className="btn" onClick={() => send()} disabled={loading || !input.trim()}>
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
