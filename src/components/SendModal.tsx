"use client";

import { useState, useEffect, useRef } from "react";

type SendModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  ensureWallet: () => Promise<{ walletId: string; address: string }>;
  usdcBalance: string | null;
  eurcBalance: string | null;
  initialAddress?: string;
  initialToken?: string;
  initialAmount?: string;
};

export function SendModal({
  isOpen,
  onClose,
  onSuccess,
  ensureWallet,
  usdcBalance,
  eurcBalance,
  initialAddress = "",
  initialToken = "USDC",
  initialAmount = "",
}: SendModalProps) {
  const [mode, setMode] = useState<"scan" | "form">("scan");
  const [recipient, setRecipient] = useState(initialAddress);
  const [token, setToken] = useState(initialToken);
  const [amount, setAmount] = useState(initialAmount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txResult, setTxResult] = useState<{ txHash?: string; txId?: string } | null>(null);

  const [scannerActive, setScannerActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<any>(null);
  const scannerContainerId = "qr-reader-container";

  // Parse scanned text (handles raw address or ethereum:0x... URI)
  const handleScannedResult = (decodedText: string) => {
    let cleanAddress = decodedText.trim();
    let parsedAmount = "";

    // Support ethereum:0x1234...?value=10
    if (cleanAddress.toLowerCase().startsWith("ethereum:")) {
      const match = cleanAddress.match(/ethereum:(0x[a-fA-F0-9]{40})/i);
      if (match) {
        cleanAddress = match[1];
      }
      const valueMatch = decodedText.match(/[?&]value=([0-9.]+)/i);
      if (valueMatch) {
        parsedAmount = valueMatch[1];
      }
    }

    setRecipient(cleanAddress);
    if (parsedAmount) setAmount(parsedAmount);
    stopScanner();
    setMode("form");
  };

  const startScanner = async () => {
    setCameraError(null);
    try {
      if (typeof window === "undefined") return;

      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
        } catch {}
      }

      const { Html5Qrcode } = await import("html5-qrcode");
      const qrCode = new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = qrCode;

      await qrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
        },
        (decodedText: string) => {
          handleScannedResult(decodedText);
        },
        () => {
          // ignore frame errors
        }
      );
      setScannerActive(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setCameraError(
        msg.includes("NotAllowedError") || msg.includes("Permission")
          ? "Vui lòng cho phép quyền truy cập Camera trên trình duyệt."
          : "Không thể mở camera. Bạn có thể nhập địa chỉ ví thủ công."
      );
      setScannerActive(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch {}
      html5QrCodeRef.current = null;
    }
    setScannerActive(false);
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setTxResult(null);
      if (initialAddress) {
        setRecipient(initialAddress);
        setMode("form");
      } else {
        setMode("scan");
      }
    } else {
      stopScanner();
    }
    return () => {
      stopScanner();
    };
  }, [isOpen, initialAddress]);

  useEffect(() => {
    if (isOpen && mode === "scan") {
      const timer = setTimeout(() => {
        startScanner();
      }, 200);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen, mode]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const targetAddr = recipient.trim();
    if (!targetAddr.startsWith("0x") || targetAddr.length !== 42) {
      setError("Địa chỉ ví không hợp lệ (phải bắt đầu bằng 0x và dài 42 ký tự)");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Vui lòng nhập số lượng hợp lệ");
      return;
    }

    setLoading(true);
    try {
      const { walletId } = await ensureWallet();
      const res = await fetch("/api/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletId,
          token,
          amount: String(numAmount),
          toAddress: targetAddr,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setTxResult({ txHash: data.txHash, txId: data.txId });
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentBalance = token === "USDC" ? usdcBalance : eurcBalance;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(5px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
        padding: "16px",
      }}
      onClick={() => {
        stopScanner();
        onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "440px",
          margin: 0,
          background: "#0f1420",
          border: "1px solid #2a3556",
          borderRadius: 20,
          padding: "22px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
          position: "relative",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <span>📤</span> Gửi Token / Quét QR
          </h2>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
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

        {/* Tab switch */}
        {!txResult && (
          <div style={{ display: "flex", gap: 8, marginBottom: 18, background: "#161d2e", padding: 4, borderRadius: 12 }}>
            <button
              type="button"
              onClick={() => setMode("scan")}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                border: "none",
                background: mode === "scan" ? "#4f7cff" : "transparent",
                color: mode === "scan" ? "#fff" : "#8892a4",
                cursor: "pointer",
              }}
            >
              📷 Quét Camera QR
            </button>
            <button
              type="button"
              onClick={() => {
                stopScanner();
                setMode("form");
              }}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                border: "none",
                background: mode === "form" ? "#4f7cff" : "transparent",
                color: mode === "form" ? "#fff" : "#8892a4",
                cursor: "pointer",
              }}
            >
              ✏️ Nhập thủ công
            </button>
          </div>
        )}

        {/* Success Result Screen */}
        {txResult && (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🎉</div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#10b981", marginBottom: 8 }}>
              Giao dịch gửi thành công!
            </h3>
            <p style={{ fontSize: 13, color: "#8892a4", marginBottom: 16 }}>
              Đã chuyển <strong>{amount} {token}</strong> tới ví {recipient.slice(0, 8)}...{recipient.slice(-6)}
            </p>
            {txResult.txHash && (
              <a
                href={`https://testnet.arcscan.app/tx/${txResult.txHash}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-block",
                  padding: "8px 16px",
                  background: "#161d2e",
                  border: "1px solid #1e2740",
                  borderRadius: 10,
                  fontSize: 12,
                  color: "#4f7cff",
                  marginBottom: 16,
                  wordBreak: "break-all",
                }}
              >
                🔍 Xem giao dịch trên ArcScan →
              </a>
            )}
            <button
              className="btn btn-full"
              onClick={() => {
                onClose();
              }}
            >
              Hoàn tất
            </button>
          </div>
        )}

        {/* Scan Mode */}
        {!txResult && mode === "scan" && (
          <div>
            <div
              style={{
                borderRadius: 14,
                overflow: "hidden",
                background: "#080b13",
                border: "1px solid #1e2740",
                minHeight: 240,
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div id={scannerContainerId} style={{ width: "100%", maxWidth: 320 }} />
              {cameraError && (
                <div style={{ padding: 16, textAlign: "center", color: "#f87171", fontSize: 13 }}>
                  <p>{cameraError}</p>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ marginTop: 10 }}
                    onClick={() => {
                      stopScanner();
                      setMode("form");
                    }}
                  >
                    Nhập địa chỉ ví thủ công
                  </button>
                </div>
              )}
            </div>
            <p style={{ fontSize: 12, color: "#8892a4", textAlign: "center", marginTop: 12 }}>
              Đưa camera vào mã QR địa chỉ ví của người nhận để tự động nhận diện
            </p>
          </div>
        )}

        {/* Form Mode */}
        {!txResult && mode === "form" && (
          <form onSubmit={handleSend}>
            {/* Recipient Input */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <label style={{ fontSize: 12, color: "#8892a4", fontWeight: 600 }}>
                  Địa chỉ ví người nhận:
                </label>
                <button
                  type="button"
                  onClick={() => setMode("scan")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#a78bfa",
                    fontSize: 11,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  📷 Quét lại QR
                </button>
              </div>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0x..."
                required
                style={{
                  width: "100%",
                  background: "#161d2e",
                  border: "1px solid #1e2740",
                  borderRadius: 10,
                  color: "#e8eaf0",
                  padding: "10px 12px",
                  fontSize: 13,
                  fontFamily: "monospace",
                  outline: "none",
                }}
              />
            </div>

            {/* Token Selector */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#8892a4", fontWeight: 600, marginBottom: 4, display: "block" }}>
                Chọn loại Token:
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                {["USDC", "EURC"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setToken(t)}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      border: token === t ? "1px solid #4f7cff" : "1px solid #1e2740",
                      background: token === t ? "rgba(79, 124, 255, 0.15)" : "#161d2e",
                      color: token === t ? "#fff" : "#8892a4",
                      cursor: "pointer",
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Input */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <label style={{ fontSize: 12, color: "#8892a4", fontWeight: 600 }}>
                  Số lượng:
                </label>
                <div style={{ fontSize: 11, color: "#8892a4" }}>
                  Khả dụng: <strong>{currentBalance ?? "0.00"} {token}</strong>
                  {currentBalance && parseFloat(currentBalance) > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmount(currentBalance)}
                      style={{
                        marginLeft: 6,
                        background: "none",
                        border: "none",
                        color: "#4f7cff",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      MAX
                    </button>
                  )}
                </div>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  style={{
                    width: "100%",
                    background: "#161d2e",
                    border: "1px solid #1e2740",
                    borderRadius: 10,
                    color: "#e8eaf0",
                    padding: "10px 12px",
                    fontSize: 14,
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
                  {token}
                </span>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: 10,
                  padding: "10px 12px",
                  color: "#f87171",
                  fontSize: 12,
                  marginBottom: 16,
                }}
              >
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-full"
              disabled={loading || !recipient || !amount}
              style={{ padding: "12px", fontSize: 14 }}
            >
              {loading ? "Đang thực hiện gửi..." : `Xác nhận gửi ${amount || "0"} ${token}`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
