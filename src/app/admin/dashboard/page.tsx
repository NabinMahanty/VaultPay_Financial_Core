"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Invoice, ClientProfile } from "@/lib/mockDb";
import { 
  DollarSign, 
  Clock, 
  CheckCircle, 
  Plus, 
  Search, 
  Building, 
  User, 
  LogOut, 
  Loader, 
  ArrowRight, 
  Calendar 
} from "@/components/Icons";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Paid" | "Pending" | "Overdue">("All");

  // Create Invoice Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  // Invoice Form Fields
  const [selectedClientId, setSelectedClientId] = useState("");
  const [customClientName, setCustomClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState<{ description: string; quantity: number; rate: number }[]>([
    { description: "", quantity: 1, rate: 0 },
  ]);

  // Set default dates on load
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    setIssueDate(today);
    setDueDate(in30Days);
  }, []);

  // Fetch Invoices and Clients
  const fetchDashboardData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError("");

      const invRes = await fetch("/api/invoices", {
        headers: {
          "x-user-role": user.role,
          "x-user-email": user.email,
        },
      });
      if (!invRes.ok) throw new Error("Failed to fetch invoices");
      const invData: Invoice[] = await invRes.json();

      // Local persistence overrides for stateless environments (e.g. Vercel)
      const createdList: Invoice[] = JSON.parse(localStorage.getItem("vaultpay_created_invoices") || "[]");
      const allInvoices = [...invData];
      createdList.forEach((cInv) => {
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

      setClients([
        {
          id: "client-acme",
          name: "Acme Corporation",
          email: "billing@acme.com",
          address: "123 Industrial Way, Suite A, New York, NY 10001",
        },
        {
          id: "client-globex",
          name: "Globex Corp",
          email: "billing@globex.com",
          address: "456 Innovation Blvd, Tech Center, San Francisco, CA 94107",
        },
      ]);
    } catch (err: any) {
      setError(err.message || "An error occurred while loading dashboard metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  // Handle client selection change to pre-fill email/address
  useEffect(() => {
    if (selectedClientId === "new") {
      setCustomClientName("");
      setClientEmail("");
      setClientAddress("");
    } else {
      const client = clients.find((c) => c.id === selectedClientId);
      if (client) {
        setCustomClientName(client.name);
        setClientEmail(client.email);
        setClientAddress(client.address);
      }
    }
  }, [selectedClientId, clients]);

  // Calculations
  const paidInvoices = invoices.filter((i) => i.status === "Paid");
  const outstandingInvoices = invoices.filter((i) => i.status === "Pending");
  const overdueInvoices = invoices.filter((i) => i.status === "Overdue");

  const totalRevenue = paidInvoices.reduce((sum, i) => sum + i.amount, 0);
  const totalOutstanding = outstandingInvoices.reduce((sum, i) => sum + i.amount, 0) + overdueInvoices.reduce((sum, i) => sum + i.amount, 0);
  const totalInvoiced = totalRevenue + totalOutstanding;
  const collectionRate = totalInvoiced > 0 ? Math.round((totalRevenue / totalInvoiced) * 100) : 0;

  // Add Item Line
  const handleAddItemLine = () => {
    setItems([...items, { description: "", quantity: 1, rate: 0 }]);
  };

  // Remove Item Line
  const handleRemoveItemLine = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  // Handle Item Input Change
  const handleItemChange = (index: number, field: "description" | "quantity" | "rate", value: any) => {
    const updated = [...items];
    if (field === "quantity") {
      updated[index].quantity = parseInt(value) || 0;
    } else if (field === "rate") {
      updated[index].rate = parseFloat(value) || 0;
    } else {
      updated[index].description = value;
    }
    setItems(updated);
  };

  // Submit Invoice Creation Form
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!customClientName) {
      setModalError("Please select a client or enter a client name.");
      return;
    }
    if (!clientEmail || !clientEmail.includes("@")) {
      setModalError("Please enter a valid client billing email.");
      return;
    }

    const invalidItems = items.some((item) => !item.description || item.quantity <= 0 || item.rate <= 0);
    if (invalidItems) {
      setModalError("Please complete all line items with descriptions, positive quantities, and rates.");
      return;
    }

    setModalError("");
    setModalLoading(true);

    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": user.role,
          "x-user-email": user.email,
        },
        body: JSON.stringify({
          clientName: customClientName,
          clientEmail,
          clientAddress,
          issueDate,
          dueDate,
          items,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to generate invoice");
      }

      const newInvoice = await res.json();

      const createdList = JSON.parse(localStorage.getItem("vaultpay_created_invoices") || "[]");
      createdList.push(newInvoice);
      localStorage.setItem("vaultpay_created_invoices", JSON.stringify(createdList));

      await fetchDashboardData();

      setIsModalOpen(false);
      setSelectedClientId("");
      setCustomClientName("");
      setClientEmail("");
      setClientAddress("");
      setItems([{ description: "", quantity: 1, rate: 0 }]);
    } catch (err: any) {
      setModalError(err.message || "Server rejected invoice generation request.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.clientEmail.toLowerCase().includes(searchQuery.toLowerCase());

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
                background: "linear-gradient(135deg, var(--color-primary), #6d28d9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px var(--color-primary-glow)"
              }}
            >
              <Building size={18} style={{ color: "white" }} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.05rem", fontWeight: 700, letterSpacing: "-0.01em", color: "var(--text-primary)" }}>
                VaultPay Core
              </h2>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", color: "var(--text-muted)", display: "block", marginTop: "1px" }}>
                NEXUS COMPLIANCE LEDGER
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid var(--border-card)",
                padding: "0.45rem 1rem",
                borderRadius: "12px",
              }}
            >
              <span style={{ display: "flex", color: "var(--color-primary-hover)" }}>
                <User size={16} />
              </span>
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
                {user?.name || "Evelyn Croft"} (CFO)
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
        {/* Page title and create button */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2.5rem",
            flexWrap: "wrap",
            gap: "1.25rem",
          }}
        >
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.03em" }}>
              Administrative Ledger
            </h1>
            <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
              Generate client invoices, track collections, and verify financial compliance.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary"
            style={{ borderRadius: "12px", gap: "0.5rem", padding: "0.8rem 1.6rem" }}
          >
            <Plus size={18} />
            <span>Generate Invoice</span>
          </button>
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
                Total Revenue (Collected)
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
              ${totalRevenue.toLocaleString()}
            </h2>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Cleared through Stripe Network
            </span>
          </div>

          <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
                Outstanding Balance
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
              Pending + Overdue accounts
            </span>
          </div>

          <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
                Accounts Receivable Rate
              </span>
              <div 
                style={{ 
                  width: "32px", 
                  height: "32px", 
                  borderRadius: "8px", 
                  background: "rgba(139, 92, 246, 0.1)", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  color: "var(--color-primary-hover)"
                }}
              >
                <DollarSign size={18} />
              </div>
            </div>
            <h2 style={{ fontSize: "2.25rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
              {collectionRate}%
            </h2>
            <div
              style={{
                width: "100%",
                height: "6px",
                background: "rgba(255, 255, 255, 0.05)",
                borderRadius: "3px",
                marginTop: "0.25rem",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${collectionRate}%`,
                  background: "linear-gradient(90deg, #8b5cf6, #10b981)",
                  borderRadius: "3px",
                }}
              />
            </div>
          </div>
        </div>

        {/* Dashboard Error Alert */}
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

        {/* Filters and Search toolbar */}
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
              placeholder="Search by invoice ID, client name..."
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
                  background: statusFilter === filter ? "var(--color-primary)" : "transparent",
                  color: statusFilter === filter ? "#ffffff" : "var(--text-secondary)",
                  boxShadow: statusFilter === filter ? "0 4px 10px rgba(139, 92, 246, 0.25)" : "none"
                }}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Ledger Table */}
        {loading ? (
          <div className="glass-card" style={{ textAlign: "center", padding: "4rem 0", borderStyle: "dashed" }}>
            <Loader size={24} className="animate-spin" style={{ color: "var(--color-primary)", marginBottom: "1rem" }} />
            <p style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Decrypting secure ledger records...</p>
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
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>No invoice records found</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
              Try broadening your filters or create a new invoice to get started.
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Client</th>
                  <th>Date</th>
                  <th>Due Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--color-primary-hover)", fontSize: "0.9rem" }}>
                      {inv.id}
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{inv.clientName}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "1px" }}>
                          {inv.clientEmail}
                        </div>
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
                        }}
                      >
                        <span>Details</span>
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

      {/* Create Invoice Modal Drawer Overlay */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(3, 3, 6, 0.75)",
            backdropFilter: "blur(8px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            padding: "1.5rem",
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: "680px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "2.5rem",
              borderColor: "rgba(255, 255, 255, 0.1)",
              borderRadius: "24px"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
              <div>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em" }}>Generate Client Invoice</h2>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                  Fill in items and dates. Invoices are stored in compliance ledger.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="btn btn-secondary"
                style={{ padding: "0.45rem 1rem", borderRadius: "10px" }}
              >
                Cancel
              </button>
            </div>

            {modalError && (
              <div
                style={{
                  padding: "0.8rem 1rem",
                  background: "var(--color-danger-bg)",
                  border: "1px solid var(--color-danger-border)",
                  borderRadius: "10px",
                  color: "var(--color-danger)",
                  fontSize: "0.85rem",
                  marginBottom: "1.5rem",
                  fontWeight: 500
                }}
              >
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateInvoice}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Client Workspace Selection</label>
                  <select
                    className="form-select"
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                  >
                    <option value="" style={{ background: "var(--bg-secondary)" }}>-- Choose Client --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id} style={{ background: "var(--bg-secondary)" }}>
                        {c.name}
                      </option>
                    ))}
                    <option value="new" style={{ background: "var(--bg-secondary)" }}>+ Dynamic Client</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Corporate Client Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Company Name"
                    value={customClientName}
                    onChange={(e) => setCustomClientName(e.target.value)}
                    disabled={selectedClientId !== "" && selectedClientId !== "new"}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Billing Officer Email</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="billing@company.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  disabled={selectedClientId !== "" && selectedClientId !== "new"}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Corporate Registered Address</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Street Address, City, ZIP, Country"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  disabled={selectedClientId !== "" && selectedClientId !== "new"}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Date of Issue</label>
                  <input
                    type="date"
                    className="form-input"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Compliance Due Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Line Items */}
              <div style={{ margin: "2rem 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <label className="form-label" style={{ margin: 0 }}>Itemized Charges</label>
                  <button
                    type="button"
                    onClick={handleAddItemLine}
                    className="btn btn-secondary"
                    style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", borderRadius: "8px", gap: "0.3rem" }}
                  >
                    <Plus size={14} />
                    <span>Line Item</span>
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  {items.map((item, index) => (
                    <div key={index} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
                      <div className="form-group" style={{ flex: 3, margin: 0 }}>
                        <input
                          type="text"
                          placeholder="Audit description / consultation scope"
                          className="form-input"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, "description", e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ width: "80px", margin: 0 }}>
                        <input
                          type="number"
                          placeholder="Qty"
                          min="1"
                          className="form-input"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ width: "120px", margin: 0 }}>
                        <input
                          type="number"
                          placeholder="Rate ($)"
                          min="0"
                          step="0.01"
                          className="form-input"
                          value={item.rate || ""}
                          onChange={(e) => handleItemChange(index, "rate", e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItemLine(index)}
                        disabled={items.length === 1}
                        className="btn btn-secondary"
                        style={{
                          padding: "0.75rem",
                          border: "1px solid var(--color-danger-border)",
                          color: "var(--color-danger)",
                          background: "transparent",
                          height: "44px",
                          width: "44px",
                          borderRadius: "10px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                  paddingTop: "1.75rem",
                  marginTop: "1.5rem",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.75rem",
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ borderRadius: "10px" }}
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="btn btn-primary"
                  style={{ gap: "0.5rem", borderRadius: "10px" }}
                >
                  {modalLoading ? (
                    <>
                      <Loader size={16} className="animate-spin" />
                      <span>Writing to Ledger...</span>
                    </>
                  ) : (
                    <>
                      <span>Release Invoice</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
