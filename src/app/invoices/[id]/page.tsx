"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { CheckoutModal } from "@/components/CheckoutModal";
import { Confetti } from "@/components/Confetti";
import { Invoice } from "@/lib/mockDb";

type Props = {
  params: Promise<{ id: string }>
}

export default function InvoiceDetailPage(props: Props) {
  const resolvedParams = use(props.params);
  const id = resolvedParams.id;

  const { user } = useAuth();
  const router = useRouter();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const fetchInvoice = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/invoices?id=${id}`, {
        headers: {
          "x-user-role": user.role,
          "x-user-email": user.email,
        },
      });

      let data: Invoice | null = null;
      if (!res.ok) {
        if (res.status === 403) {
          router.replace("/403");
          return;
        }
        const createdList: Invoice[] = JSON.parse(localStorage.getItem("vaultpay_created_invoices") || "[]");
        const localInv = createdList.find(inv => inv.id === id);
        if (localInv) {
          data = localInv;
        } else {
          throw new Error("Failed to load invoice details");
        }
      } else {
        data = await res.json();
      }

      if (data) {
        const paidList: string[] = JSON.parse(localStorage.getItem("vaultpay_paid_invoices") || "[]");
        const todayStr = new Date().toISOString().split("T")[0];
        if (paidList.includes(data.id)) {
          data.status = "Paid";
          if (!data.paidAt) {
            data.paidAt = new Date().toISOString();
          }
        } else if (data.status === "Pending" && data.dueDate < todayStr) {
          data.status = "Overdue";
        }
        setInvoice(data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load invoice records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [user, id]);

  const handleDownloadPDF = () => {
    window.print();
  };

  const handlePaymentSuccess = () => {
    setIsCheckoutOpen(false);
    setShowConfetti(true);

    const paidList: string[] = JSON.parse(localStorage.getItem("vaultpay_paid_invoices") || "[]");
    if (!paidList.includes(id)) {
      paidList.push(id);
      localStorage.setItem("vaultpay_paid_invoices", JSON.stringify(paidList));
    }

    fetchInvoice();
  };

  const handleBack = () => {
    if (user?.role === "admin") {
      router.push("/admin/dashboard");
    } else {
      router.push("/client/dashboard");
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <p style={{ color: "var(--text-secondary)" }}>Loading invoice details...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", padding: "1.5rem" }}>
        <div className="glass-card" style={{ maxWidth: "480px", width: "100%", textAlign: "center", padding: "2rem" }}>
          <h2>Access Violation</h2>
          <p style={{ margin: "0.75rem 0 1.5rem 0", color: "var(--text-secondary)" }}>{error || "Invoice record not found."}</p>
          <button onClick={handleBack} className="btn btn-secondary" style={{ width: "100%", borderRadius: "6px" }}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const subtotal = invoice.items.reduce((sum, item) => sum + item.quantity * item.rate, 0);

  return (
    <div style={{ minHeight: "100vh", padding: "3rem 1.5rem" }}>
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />

      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        {/* Navigation back and quick actions */}
        <div
          className="no-print"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2rem",
          }}
        >
          <button
            onClick={handleBack}
            className="btn btn-secondary"
            style={{ borderRadius: "6px", padding: "0.5rem 1rem" }}
          >
            <span>Back</span>
          </button>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="btn btn-secondary"
              style={{ borderRadius: "6px" }}
            >
              <span>Print Invoice</span>
            </button>

            {invoice.status !== "Paid" && user?.role === "client" && (
              <button
                onClick={() => setIsCheckoutOpen(true)}
                className="btn btn-primary"
                style={{ borderRadius: "6px" }}
              >
                <span>Pay Invoice</span>
              </button>
            )}
          </div>
        </div>

        {/* Invoice Statement Sheet */}
        <div
          className="glass-card"
          style={{
            padding: "3rem",
            position: "relative",
            borderColor: "var(--border-card)",
            overflow: "hidden",
            borderRadius: "12px",
            background: "var(--bg-secondary)"
          }}
        >
          {/* PAID STAMP */}
          {invoice.status === "Paid" && (
            <div className="stamp-container">
              <div className="rubber-stamp stamp-paid">PAID</div>
            </div>
          )}
          {invoice.status === "Pending" && (
            <div className="stamp-container">
              <div className="rubber-stamp stamp-pending">PENDING</div>
            </div>
          )}
          {invoice.status === "Overdue" && (
            <div className="stamp-container">
              <div className="rubber-stamp stamp-overdue">OVERDUE</div>
            </div>
          )}

          {/* Letterhead */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              borderBottom: "1px solid var(--border-card)",
              paddingBottom: "2rem",
              marginBottom: "2rem",
            }}
          >
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                NEXUS CORPORATE SERVICES
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                500 Fifth Avenue, Suite 4500<br />
                New York, NY 10110, USA
              </p>
            </div>

            <div style={{ textAlign: "right" }}>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Invoice ID
              </span>
              <h2 style={{ fontFamily: "var(--font-mono)", fontSize: "1.5rem", color: "var(--text-primary)", margin: "0.2rem 0", fontWeight: 500 }}>
                {invoice.id}
              </h2>
              <span
                className={`badge ${
                  invoice.status === "Paid"
                    ? "badge-paid"
                    : invoice.status === "Pending"
                    ? "badge-pending"
                    : "badge-overdue"
                }`}
                style={{ marginTop: "0.25rem" }}
              >
                {invoice.status}
              </span>
            </div>
          </div>

          {/* Metadata: Issuer and Bill To details */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 0.8fr",
              gap: "2rem",
              marginBottom: "2.5rem",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  display: "block",
                  marginBottom: "0.5rem",
                }}
              >
                Bill To
              </span>
              <strong style={{ fontSize: "1rem", color: "var(--text-primary)", display: "block", fontWeight: 600 }}>
                {invoice.clientName}
              </strong>
              <p style={{ fontSize: "0.85rem", marginTop: "0.25rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                {invoice.clientAddress || "Corporate Registered HQ"}<br />
                Email: {invoice.clientEmail}
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    display: "block",
                    marginBottom: "0.3rem",
                  }}
                >
                  Date Issued
                </span>
                <span style={{ fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: 500 }}>
                  {invoice.issueDate}
                </span>
              </div>

              <div>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    display: "block",
                    marginBottom: "0.3rem",
                  }}
                >
                  Due Date
                </span>
                <span style={{ fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: 500 }}>
                  {invoice.dueDate}
                </span>
              </div>

              {invoice.paidAt && (
                <div style={{ gridColumn: "span 2" }}>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      display: "block",
                      marginBottom: "0.3rem",
                    }}
                  >
                    Paid On
                  </span>
                  <span style={{ fontSize: "0.85rem", color: "var(--color-success)", fontWeight: 600 }}>
                    {new Date(invoice.paidAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Itemized Table */}
          <div style={{ border: "1px solid var(--border-card)", borderRadius: "6px", overflow: "hidden", marginBottom: "2rem" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border-card)" }}>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 500, color: "var(--text-secondary)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Description
                  </th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 500, color: "var(--text-secondary)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center", width: "80px" }}>
                    Qty
                  </th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 500, color: "var(--text-secondary)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right", width: "120px" }}>
                    Rate
                  </th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 500, color: "var(--text-secondary)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right", width: "140px" }}>
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: idx === invoice.items.length - 1 ? "none" : "1px solid var(--border-card)" }}>
                    <td style={{ padding: "1rem", color: "var(--text-primary)" }}>
                      {item.description}
                    </td>
                    <td style={{ padding: "1rem", color: "var(--text-secondary)", textAlign: "center" }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: "1rem", color: "var(--text-secondary)", textAlign: "right" }}>
                      ${item.rate.toLocaleString()}
                    </td>
                    <td style={{ padding: "1rem", fontWeight: 500, color: "var(--text-primary)", textAlign: "right" }}>
                      ${(item.quantity * item.rate).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div style={{ width: "240px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", fontSize: "0.85rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>Subtotal:</span>
                <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>${subtotal.toLocaleString()}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "0.6rem 0",
                  borderTop: "1px solid var(--border-card)",
                  marginTop: "0.4rem",
                }}
              >
                <strong style={{ fontSize: "0.95rem", fontWeight: 600 }}>Total:</strong>
                <strong style={{ fontSize: "0.95rem", color: "var(--text-primary)", fontWeight: 600 }}>
                  ${invoice.amount.toLocaleString()} USD
                </strong>
              </div>
            </div>
          </div>

          {/* Terms & compliance sign-off */}
          <div
            style={{
              marginTop: "3rem",
              borderTop: "1px solid var(--border-card)",
              paddingTop: "1.5rem",
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              lineHeight: "1.5",
            }}
          >
            <p style={{ fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
              Payment Information
            </p>
            <p>
              Please settle all invoice balances before their compliance due date. Standard credit card payments processed via the secure portal clear instantly. Receipts are issued automatically post-transaction clearing. For support, please reference the invoice ID and contact IT administration.
            </p>
          </div>
        </div>
      </div>

      {/* Checkout Modal Frame */}
      {isCheckoutOpen && invoice && (
        <CheckoutModal
          invoiceId={invoice.id}
          amount={invoice.amount}
          clientEmail={invoice.clientEmail}
          onSuccess={handlePaymentSuccess}
          onClose={() => setIsCheckoutOpen(false)}
        />
      )}
    </div>
  );
}
