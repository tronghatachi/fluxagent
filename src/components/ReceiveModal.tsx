"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

type ReceiveModalProps = {
  isOpen: boolean;
  onClose: () => void;
  address: string;
};

const SUPPORTED_TOKENS = [
  { symbol: "USDC", name: "USD Coin", color: "#2775ca" },
  { symbol: "EURC", name: "Euro Coin", color: "#1a5394" },
  { symbol: "cirBTC", name: "Circle Bitcoin", color: "#f7931a" },
];

export function ReceiveModal({ isOpen, onClose, address }: ReceiveModalProps) {
  const [selectedToken, setSelectedToken] = useState("USDC");
  const [amount, setAmount] = useState("");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Standard address QR, or payment format if amount is provided
  const qrValue = amount && parseFloat(amount) > 0
    ? `ethereum:${address}?value=${amount}`
    : address;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "420px",
          margin: 0,
          background: "#0f1420",
          border: "1px solid #2a3556",
          borderRadius: 20,
          padding: "24px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
          textAlign: "center",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <span>📥</span> Receive / Nạp Token
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#8892a4",
              fontSize: 20,
              cursor: "pointer",
              padding: "4px 8px",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Token selection */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, justifyContent: "center" }}>
          {SUPPORTED_TOKENS.map((token) => {
            const isSelected = selectedToken === token.symbol;
            return (
              <button
                key={token.symbol}
                type="button"
                onClick={() => setSelectedToken(token.symbol)}
                style={{
                  flex: 1,
                  padding: "8px 10px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  border: isSelected ? "1px solid #4f7cff" : "1px solid #1e2740",
                  background: isSelected ? "rgba(79, 124, 255, 0.15)" : "#161d2e",
                  color: isSelected ? "#fff" : "#8892a4",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {token.symbol}
              </button>
            );
          })}
        </div>

        {/* QR Code Container */}
        <div
          style={{
            background: "#ffffff",
            padding: "16px",
            borderRadius: 16,
            display: "inline-block",
            margin: "0 auto 16px",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
          }}
        >
          <QRCodeSVG
            value={qrValue}
            size={180}
            level="H"
            includeMargin={false}
          />
        </div>

        {/* Network & Info Badge */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "#161d2e",
              border: "1px solid #1e2740",
              borderRadius: 20,
              padding: "4px 12px",
              fontSize: 12,
              color: "#a78bfa",
              fontWeight: 600,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
            Arc Testnet
          </div>
          <p style={{ fontSize: 12, color: "#8892a4", marginTop: 6 }}>
            Only send <strong>{selectedToken}</strong> (Arc Testnet) to this address
          </p>
        </div>

        {/* Amount input (optional) */}
        <div style={{ marginBottom: 16, textAlign: "left" }}>
          <label style={{ fontSize: 12, color: "#8892a4", fontWeight: 600, marginBottom: 4, display: "block" }}>
            Yêu cầu số lượng (tùy chọn):
          </label>
          <div style={{ position: "relative" }}>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              style={{
                width: "100%",
                background: "#161d2e",
                border: "1px solid #1e2740",
                borderRadius: 10,
                color: "#e8eaf0",
                padding: "8px 12px",
                fontSize: 13,
                outline: "none",
              }}
            />
            <span
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 12,
                color: "#8892a4",
                fontWeight: 600,
              }}
            >
              {selectedToken}
            </span>
          </div>
        </div>

        {/* Address Display & Copy */}
        <div style={{ background: "#161d2e", border: "1px solid #1e2740", borderRadius: 12, padding: "10px 14px", marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#8892a4", marginBottom: 4, textAlign: "left", fontWeight: 600 }}>
            Địa chỉ ví:
          </div>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 12,
              color: "#e8eaf0",
              wordBreak: "break-all",
              userSelect: "all",
              textAlign: "left",
            }}
          >
            {address}
          </div>
        </div>

        <button
          className="btn btn-full"
          onClick={handleCopy}
          style={{
            background: copied ? "#10b981" : "#4f7cff",
            transition: "background 0.2s ease",
            fontWeight: 600,
          }}
        >
          {copied ? "✓ Đã sao chép địa chỉ!" : "📋 Sao chép địa chỉ ví"}
        </button>
      </div>
    </div>
  );
}
