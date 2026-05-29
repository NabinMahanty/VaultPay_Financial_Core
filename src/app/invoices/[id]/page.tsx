"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { CheckoutModal } from "@/components/CheckoutModal";
import { Confetti } from "@/components/Confetti";
import { Invoice } from "@/lib/mockDb";
import { 
  ArrowLeft, 
  Download, 
  CreditCard, 
  Building, 
  Calendar, 
  DollarSign, 
  CheckCircle, 
  Shield 
} from "@/components/Icons";

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
        <div style={{ textAlign: "center" }}>
          <p>Decrypting invoice file...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", padding: "1.5rem" }}>
        <div className="glass-card" style={{ maxWidth: "480px", width: "100%", textAlign: "center", padding: "2.5rem" }}>
          <h2 style={{ color: "var(--color-danger)" }}>Invoice Access Violation</h2>
          <p style={{ margin: "0.75rem 0 1.5rem 0", color: "var(--text-secondary)" }}>{error || "Invoice record not found."}</p>
          <button onClick={handleBack} className="btn btn-secondary" style={{ width: "100%", borderRadius: "10px" }}>
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

      <div style={{ maxWidth: "840px", margin: "0 auto" }}>
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
            style={{ borderRadius: "10px", padding: "0.55rem 1.1rem", gap: "0.4rem" }}
          >
            <ArrowLeft size={16} />
            <span>Dashboard</span>
          </button>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="btn btn-secondary"
              style={{ gap: "0.4rem", borderRadius: "10px" }}
            >
              <Download size={16} />
              <span>Download PDF</span>
            </button>

            {invoice.status !== "Paid" && user?.role === "client" && (
              <button
                onClick={() => setIsCheckoutOpen(true)}
                className="btn btn-primary"
                style={{ background: "var(--color-success)", boxShadow: "0 4px 14px rgba(16, 185, 129, 0.2)", gap: "0.4rem", borderRadius: "10px" }}
              >
                <CreditCard size={16} />
                <span>Pay Invoice</span>
              </button>
            )}
          </div>
        </div>

        {/* Invoice Statement Sheet */}
        <div
          className="glass-card"
          style={{
            padding: "3.5rem",
            position: "relative",
            borderColor: "rgba(255, 255, 255, 0.08)",
            overflow: "hidden",
            borderRadius: "24px"
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
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              paddingBottom: "2.5rem",
              marginBottom: "2.5rem",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
                <Shield size={20} style={{ color: "var(--color-primary-hover)" }} />
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, letterSpacing: "-0.01em", color: "var(--text-primary)" }}>
                  NEXUS CORPORATE SERVICES
                </h3>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                Financial Core Security Audit Division<br />
                500 Fifth Avenue, Suite 4500<br />
                New York, NY 10110, USA
              </p>
            </div>

            <div style={{ textAlign: "right" }}>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Statement Ref
              </span>
              <h2 style={{ fontFamily: "var(--font-mono)", fontSize: "1.8rem", color: "var(--text-primary)", margin: "0.2rem 0", fontWeight: 700 }}>
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
                style={{ marginTop: "0.35rem" }}
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
              gap: "2.5rem",
              marginBottom: "3rem",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  display: "block",
                  marginBottom: "0.6rem",
                }}
              >
                Prepared For
              </span>
              <strong style={{ fontSize: "1.05rem", color: "var(--text-primary)", display: "block", fontWeight: 700 }}>
                {invoice.clientName}
              </strong>
              <p style={{ fontSize: "0.85rem", marginTop: "0.35rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                {invoice.clientAddress || "Corporate Registered HQ"}<br />
                Contact: {invoice.clientEmail}
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
              <div>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    display: "block",
                    marginBottom: "0.35rem",
                  }}
                >
                  Date Issued
                </span>
                <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <Calendar size={14} style={{ color: "var(--text-muted)" }} />
                  {invoice.issueDate}
                </span>
              </div>

              <div>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    display: "block",
                    marginBottom: "0.35rem",
                  }}
                >
                  Due Date
                </span>
                <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <Calendar size={14} style={{ color: "var(--text-muted)" }} />
                  {invoice.dueDate}
                </span>
              </div>

              {invoice.paidAt && (
                <div style={{ gridColumn: "span 2" }}>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      display: "block",
                      marginBottom: "0.35rem",
                    }}
                  >
                    Settled On
                  </span>
                  <span style={{ fontSize: "0.85rem", color: "var(--color-success)", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <CheckCircle size={15} />
                    {new Date(invoice.paidAt).toLocaleDateString()} via Stripe Network
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Itemized Table */}
          <div style={{ border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "14px", overflow: "hidden", marginBottom: "2.5rem", background: "rgba(255,255,255,0.01)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <th style={{ padding: "1rem 1.25rem", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Service Charge Breakdown
                  </th>
                  <th style={{ padding: "1rem 1.25rem", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "center", width: "80px" }}>
                    Qty
                  </th>
                  <th style={{ padding: "1rem 1.25rem", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "right", width: "130px" }}>
                    Rate
                  </th>
                  <th style={{ padding: "1rem 1.25rem", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "right", width: "150px" }}>
                    Line Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: idx === invoice.items.length - 1 ? "none" : "1px solid rgba(255, 255, 255, 0.05)" }}>
                    <td style={{ padding: "1.25rem", fontWeight: 600, color: "var(--text-primary)" }}>
                      {item.description}
                    </td>
                    <td style={{ padding: "1.25rem", color: "var(--text-secondary)", textAlign: "center" }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: "1.25rem", color: "var(--text-secondary)", textAlign: "right" }}>
                      ${item.rate.toLocaleString()}
                    </td>
                    <td style={{ padding: "1.25rem", fontWeight: 700, color: "var(--text-primary)", textAlign: "right" }}>
                      ${(item.quantity * item.rate).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div style={{ width: "300px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.55rem 0", fontSize: "0.9rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>Subtotal:</span>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>${subtotal.toLocaleString()} USD</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.55rem 0", fontSize: "0.9rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>Stripe Processing:</span>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>$0.00 USD</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "0.9rem 0",
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                  marginTop: "0.6rem",
                }}
              >
                <strong style={{ fontSize: "1rem", fontWeight: 700 }}>Total Invoiced:</strong>
                <strong style={{ fontSize: "1.15rem", color: "var(--color-primary-hover)", fontWeight: 800, display: "flex", alignItems: "center" }}>
                  <DollarSign size={18} style={{ marginRight: "-1px" }} />
                  {invoice.amount.toLocaleString()} USD
                </strong>
              </div>
            </div>
          </div>

          {/* Terms & compliance sign-off */}
          <div
            style={{
              marginTop: "4.5rem",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              paddingTop: "1.75rem",
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              lineHeight: "1.6",
            }}
          >
            <p style={{ fontWeight: 700, color: "var(--text-secondary)", marginBottom: "0.35rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Nexus Corporate Services Compliance & Security Policy
            </p>
            <p>
              This invoice contains high-value cybersecurity and architectural review scopes. All payments settled via Stripe Credit Card elements are instant. Invoices are cryptographic proof of settlement, backed by decentralized compliance ledger logs. Incidents or queries regarding payment security should be escalated to Mr. Nakul (IT Management).
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
