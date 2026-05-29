"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Invoice } from "@/lib/mockDb";
import { 
  DollarSign, 
  Clock, 
  CheckCircle, 
  Search, 
  Building, 
  LogOut, 
  Loader, 
  ArrowRight 
} from "@/components/Icons";

export default function ClientDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Paid" | "Pending" | "Overdue">("All");

  const fetchClientInvoices = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/invoices", {
        headers: {
          "x-user-role": user.role,
          "x-user-email": user.email,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch client invoices");
      const data: Invoice[] = await res.json();

      const createdList: Invoice[] = JSON.parse(localStorage.getItem("vaultpay_created_invoices") || "[]");
      const clientCreated = createdList.filter(inv => inv.clientEmail.toLowerCase() === user.email.toLowerCase());

      const allInvoices = [...data];
      clientCreated.forEach((cInv) => {
        if (!allInvoices.some((inv) => inv.id === cInv.id)) {
          allInvoices.unshift(cInv);
        }
      });

      const paidList: string[] = JSON.parse(localStorage.getItem("vaultpay_paid_invoices") || "[]");
      const todayStr = new Date().toISOString().split("T")[0];
      allInvoices.forEach((inv) => {
        if (paidList.includes(inv.id)) {
          inv.status = "Paid";
          if (!inv.paidAt) {
            inv.paidAt = new Date().toISOString();
          }
        } else if (inv.status === "Pending" && inv.dueDate < todayStr) {
          inv.status = "Overdue";
        }
      });

      setInvoices(allInvoices);
    } catch (err: any) {
      setError(err.message || "An error occurred while loading your billing details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientInvoices();
  }, [user]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  // Calculations
  const paidInvoices = invoices.filter((i) => i.status === "Paid");
  const outstandingInvoices = invoices.filter((i) => i.status === "Pending");
  const overdueInvoices = invoices.filter((i) => i.status === "Overdue");

  const totalPaid = paidInvoices.reduce((sum, i) => sum + i.amount, 0);
  const totalOutstanding = outstandingInvoices.reduce((sum, i) => sum + i.amount, 0) + overdueInvoices.reduce((sum, i) => sum + i.amount, 0);

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.items.some((item) => item.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "All" ? true : inv.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Top Navbar */}
      <header
        style={{
          borderBottom: "1px solid var(--border-card)",
          background: "rgba(10, 10, 15, 0.65)",
          backdropFilter: "blur(16px)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "1rem 1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <div 
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, var(--color-success), #059669)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)"
              }}
            >
              <Building size={18} style={{ color: "white" }} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.05rem", fontWeight: 700, letterSpacing: "-0.01em", color: "var(--text-primary)" }}>
                VaultPay Core
              </h2>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", color: "var(--text-muted)", display: "block", marginTop: "1px" }}>
                SECURE CLIENT PORTAL
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.55rem",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid var(--border-card)",
                padding: "0.45rem 1rem",
                borderRadius: "12px",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "var(--color-success)",
                  boxShadow: "0 0 8px var(--color-success)",
                }}
              />
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
                {user?.clientProfile?.name || "Corporate Client"}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{ padding: "0.45rem 1rem", fontSize: "0.85rem", borderRadius: "12px", gap: "0.4rem" }}
            >
              <LogOut size={15} />
              <span>Disconnect</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="main-content">
        <div style={{ marginBottom: "2.5rem" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.03em" }}>
            Corporate Billing History
          </h1>
          <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            Manage outstanding balances, review consultation itemizations, and submit secure credit card payments.
          </p>
        </div>

        {/* Analytics Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.5rem",
            marginBottom: "2.5rem",
          }}
        >
          <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
                Outstanding Balance Due
              </span>
              <div 
                style={{ 
                  width: "32px", 
                  height: "32px", 
                  borderRadius: "8px", 
                  background: "rgba(245, 158, 11, 0.1)", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  color: "var(--color-pending)"
                }}
              >
                <Clock size={18} />
              </div>
            </div>
            <h2 style={{ fontSize: "2.25rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
              ${totalOutstanding.toLocaleString()}
            </h2>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Requires immediate action
            </span>
          </div>

          <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
                Total Fees Settled
              </span>
              <div 
                style={{ 
                  width: "32px", 
                  height: "32px", 
                  borderRadius: "8px", 
                  background: "rgba(16, 185, 129, 0.1)", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  color: "var(--color-success)"
                }}
              >
                <CheckCircle size={18} />
              </div>
            </div>
            <h2 style={{ fontSize: "2.25rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
              ${totalPaid.toLocaleString()}
            </h2>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Securely receipted invoices
            </span>
          </div>
        </div>

        {/* Client Error Alert */}
        {error && (
          <div
            style={{
              padding: "1rem",
              background: "var(--color-danger-bg)",
              border: "1px solid var(--color-danger-border)",
              borderRadius: "12px",
              color: "var(--color-danger)",
              marginBottom: "1.5rem",
              fontWeight: 500
            }}
          >
            <span>{error}</span>
          </div>
        )}

        {/* Search & Filter toolbar */}
        <div
          className="glass-card"
          style={{
            padding: "1rem 1.25rem",
            marginBottom: "2rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1.25rem",
            borderRadius: "16px"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "10px",
              padding: "0.5rem 1rem",
              minWidth: "280px",
              width: "100%",
              maxWidth: "380px",
              transition: "border-color 0.2s ease"
            }}
          >
            <span style={{ display: "flex", color: "var(--text-muted)" }}>
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Search by invoice ID or item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-primary)",
                fontSize: "0.9rem",
                width: "100%",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "0.4rem", background: "rgba(255, 255, 255, 0.03)", padding: "0.3rem", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
            {(["All", "Paid", "Pending", "Overdue"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className="btn"
                style={{
                  padding: "0.45rem 1.1rem",
                  fontSize: "0.85rem",
                  borderRadius: "8px",
                  background: statusFilter === filter ? "var(--color-success)" : "transparent",
                  color: statusFilter === filter ? "#ffffff" : "var(--text-secondary)",
                  boxShadow: statusFilter === filter ? "0 4px 10px rgba(16, 185, 129, 0.25)" : "none"
                }}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Invoices List */}
        {loading ? (
          <div className="glass-card" style={{ textAlign: "center", padding: "4rem 0", borderStyle: "dashed" }}>
            <Loader size={24} className="animate-spin" style={{ color: "var(--color-success)", marginBottom: "1rem" }} />
            <p style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Loading secure billing ledger...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div
            className="glass-card"
            style={{
              textAlign: "center",
              padding: "5rem 2rem",
              borderStyle: "dashed",
              borderColor: "rgba(255, 255, 255, 0.1)",
            }}
          >
            <Building size={36} style={{ color: "var(--text-muted)", marginBottom: "1rem" }} />
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>No invoices listed</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
              Your account does not have any invoices under this category.
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Statement Description</th>
                  <th>Date Issued</th>
                  <th>Due Date</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--color-success)", fontSize: "0.9rem" }}>
                      {inv.id}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)", maxWidth: "320px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {inv.items[0]?.description || "Consultation Fees"}
                        {inv.items.length > 1 && ` (+${inv.items.length - 1} more items)`}
                      </div>
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{inv.issueDate}</td>
                    <td style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{inv.dueDate}</td>
                    <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                      ${inv.amount.toLocaleString()}
                    </td>
                    <td>
                      <span
                        className={`badge ${inv.status === "Paid"
                          ? "badge-paid"
                          : inv.status === "Pending"
                            ? "badge-pending"
                            : "badge-overdue"
                          }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => router.push(`/invoices/${inv.id}`)}
                        className="btn btn-secondary"
                        style={{
                          padding: "0.4rem 0.85rem",
                          fontSize: "0.8rem",
                          borderRadius: "8px",
                          gap: "0.3rem",
                          borderColor: inv.status !== "Paid" ? "var(--color-success-border)" : "rgba(255, 255, 255, 0.08)",
                          color: inv.status !== "Paid" ? "var(--color-success)" : "var(--text-primary)",
                          background: inv.status !== "Paid" ? "rgba(16, 185, 129, 0.05)" : "rgba(255, 255, 255, 0.04)"
                        }}
                      >
                        <span>{inv.status === "Paid" ? "View Receipt" : "Review & Pay"}</span>
                        <ArrowRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
