"use client";

import React, { useState } from "react";

interface CheckoutModalProps {
  invoiceId: string;
  amount: number;
  clientEmail: string;
  onSuccess: () => void;
  onClose: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  invoiceId,
  amount,
  clientEmail,
  onSuccess,
  onClose,
}) => {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 16) value = value.slice(0, 16);
    const matches = value.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      setCardNumber(parts.join(" "));
    } else {
      setCardNumber(value);
    }
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length >= 3) {
      setExpiry(`${value.slice(0, 2)}/${value.slice(2)}`);
    } else {
      setExpiry(value);
    }
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 4) setCvc(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing || success) return;

    if (!cardNumber || cardNumber.replace(/\s/g, "").length < 16) {
      setError("Please enter a valid 16-digit card number.");
      return;
    }
    if (!expiry || expiry.length < 5) {
      setError("Please enter card expiration date (MM/YY).");
      return;
    }
    if (!cvc || cvc.length < 3) {
      setError("Please enter card verification code.");
      return;
    }
    if (!name) {
      setError("Please enter cardholder name.");
      return;
    }

    setError("");
    setIsProcessing(true);
    setStatusMessage("Verifying card parameters...");

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setStatusMessage("Authorizing payment amount...");

      const savedSession = localStorage.getItem("vaultpay_session");
      const userSession = savedSession ? JSON.parse(savedSession) : null;

      if (!userSession) {
        throw new Error("Authentication session expired.");
      }

      setStatusMessage("Clearing transaction...");
      const res = await fetch("/api/pay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": userSession.role,
          "x-user-email": userSession.email,
        },
        body: JSON.stringify({
          invoiceId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Stripe transaction declined.");
      }

      await res.json();
      setStatusMessage("Finalizing invoice record...");
      await new Promise((resolve) => setTimeout(resolve, 600));

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during processing.");
      setIsProcessing(false);
      setStatusMessage("");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1100,
        padding: "1.5rem",
      }}
    >
      <div
        className="glass-card"
        style={{
          maxWidth: "420px",
          width: "100%",
          padding: "2rem",
          borderColor: "var(--border-card)",
          position: "relative",
          background: "var(--bg-secondary)",
          borderRadius: "12px"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 600 }}>Pay Invoice</h2>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
              Secure checkout gateway
            </p>
          </div>
          {!isProcessing && !success && (
            <button
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: "0.35rem 0.75rem", borderRadius: "6px", fontSize: "0.8rem" }}
            >
              Cancel
            </button>
          )}
        </div>

        {error && (
          <div
            style={{
              padding: "0.75rem 1rem",
              background: "var(--color-danger-bg)",
              border: "1px solid var(--color-danger-border)",
              borderRadius: "6px",
              color: "var(--color-danger)",
              fontSize: "0.85rem",
              marginBottom: "1.25rem",
            }}
          >
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div
            style={{
              textAlign: "center",
              padding: "1.5rem 0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <div>
              <h3 style={{ color: "var(--color-success)", fontSize: "1.1rem", fontWeight: 600 }}>Payment Succeeded</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.35rem", lineHeight: "1.4" }}>
                Invoice {invoiceId} has been successfully settled.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="stripe-form-container">
            <div
              style={{
                background: "#09090b",
                border: "1px solid var(--border-card)",
                padding: "0.85rem 1rem",
                borderRadius: "6px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.5rem",
              }}
            >
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Amount to Pay</span>
                <strong style={{ fontSize: "1.15rem", fontWeight: 600, color: "var(--text-primary)" }}>${amount.toLocaleString()} USD</strong>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "right" }}>
                <span>Invoice: </span>
                <div style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>{invoiceId}</div>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Card Number</label>
              <div className="stripe-input-wrapper">
                <input
                  type="text"
                  className="stripe-input"
                  placeholder="4242 4242 4242 4242"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  disabled={isProcessing}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Expiration Date</label>
                <div className="stripe-input-wrapper">
                  <input
                    type="text"
                    className="stripe-input"
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={handleExpiryChange}
                    disabled={isProcessing}
                    style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">CVC</label>
                <div className="stripe-input-wrapper">
                  <input
                    type="text"
                    className="stripe-input"
                    placeholder="123"
                    value={cvc}
                    onChange={handleCvcChange}
                    disabled={isProcessing}
                    style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}
                  />
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: "0.75rem" }}>
              <label className="form-label">Cardholder Name</label>
              <div className="stripe-input-wrapper">
                <input
                  type="text"
                  className="stripe-input"
                  placeholder="Cardholder Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isProcessing}
                />
              </div>
            </div>

            {isProcessing && (
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid var(--border-card)",
                  borderRadius: "6px",
                  padding: "0.6rem 0.85rem",
                  fontSize: "0.8rem",
                  color: "var(--text-secondary)",
                  marginBottom: "0.5rem",
                  textAlign: "center"
                }}
              >
                <span>{statusMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isProcessing}
              className="btn btn-primary"
              style={{ width: "100%", height: "42px", borderRadius: "6px" }}
            >
              {isProcessing ? (
                <span>Processing...</span>
              ) : (
                <span>Submit Payment</span>
              )}
            </button>

            <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", textAlign: "center", marginTop: "0.5rem" }}>
              Fully encrypted secure transaction.
            </p>
          </form>
        )}
      </div>
    </div>
  );
};
