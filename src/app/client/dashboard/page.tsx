"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Invoice } from "@/lib/mockDb";

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
          background: "var(--bg-secondary)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            padding: "1rem 1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--text-primary)" }}>
              VaultPay
            </h2>
            <span style={{ fontSize: "0.68rem", fontWeight: 500, color: "var(--text-muted)", display: "block", marginTop: "1px" }}>
              Client Portal
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              {user?.clientProfile?.name || "Corporate Client"}
            </span>

            <button
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", borderRadius: "6px" }}
            >
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="main-content">
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 600 }}>
            Billing History
          </h1>
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            Manage and settle outstanding corporate fees.
          </p>
        </div>

        {/* Analytics Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.25rem",
            marginBottom: "2rem",
          }}
        >
          <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
              Outstanding Balance
            </span>
            <h2 style={{ fontSize: "2rem", fontWeight: 600, color: "var(--text-primary)" }}>
              ${totalOutstanding.toLocaleString()}
            </h2>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Awaiting payment
            </span>
          </div>

          <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
              Total Paid
            </span>
            <h2 style={{ fontSize: "2rem", fontWeight: 600, color: "var(--text-primary)" }}>
              ${totalPaid.toLocaleString()}
            </h2>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Settled statements
            </span>
          </div>
        </div>

        {/* Search & Filter toolbar */}
        <div
          className="glass-card"
          style={{
            padding: "1rem",
            marginBottom: "1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            borderRadius: "8px"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "#09090b",
              border: "1px solid var(--border-card)",
              borderRadius: "6px",
              padding: "0.5rem 0.75rem",
              minWidth: "280px",
              width: "100%",
              maxWidth: "340px",
            }}
          >
            <input
              type="text"
              placeholder="Search statements..."
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

          <div style={{ display: "flex", gap: "0.25rem" }}>
            {(["All", "Paid", "Pending", "Overdue"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className="btn"
                style={{
                  padding: "0.4rem 0.9rem",
                  fontSize: "0.85rem",
                  borderRadius: "6px",
                  background: statusFilter === filter ? "var(--border-card)" : "transparent",
                  color: statusFilter === filter ? "var(--text-primary)" : "var(--text-secondary)",
                }}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Invoices List */}
        {loading ? (
          <div className="glass-card" style={{ textAlign: "center", padding: "3rem 0" }}>
            <p style={{ color: "var(--text-secondary)" }}>Loading statements...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div
            className="glass-card"
            style={{
              textAlign: "center",
              padding: "4rem 2rem",
              borderStyle: "dashed",
              borderColor: "var(--border-card)",
            }}
          >
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600 }}>No statements found</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
              No statements match the active filter criteria.
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Statement Description</th>
                  <th>Issued</th>
                  <th>Due</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--text-primary)" }}>
                      {inv.id}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: "var(--text-primary)", maxWidth: "320px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {inv.items[0]?.description || "Consultation Fees"}
                        {inv.items.length > 1 && ` (+${inv.items.length - 1} more items)`}
                      </div>
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>{inv.issueDate}</td>
                    <td style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>{inv.dueDate}</td>
                    <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>
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
                          padding: "0.35rem 0.75rem",
                          fontSize: "0.8rem",
                          borderRadius: "6px",
                        }}
                      >
                        {inv.status === "Paid" ? "View" : "Review & Pay"}
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
