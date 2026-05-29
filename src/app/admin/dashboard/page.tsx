"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Invoice, ClientProfile } from "@/lib/mockDb";

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
              Nexus Corporate Services
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              {user?.name || "Evelyn Croft"}
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
        {/* Page title and create button */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2rem",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 600 }}>
              Administrative Ledger
            </h1>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
              Review client statements and generate compliance invoices.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary"
            style={{ borderRadius: "6px", padding: "0.6rem 1.2rem" }}
          >
            <span>Create Invoice</span>
          </button>
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
              Total Collected
            </span>
            <h2 style={{ fontSize: "2rem", fontWeight: 600, color: "var(--text-primary)" }}>
              ${totalRevenue.toLocaleString()}
            </h2>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Cleared statements
            </span>
          </div>

          <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
              Outstanding Balance
            </span>
            <h2 style={{ fontSize: "2rem", fontWeight: 600, color: "var(--text-primary)" }}>
              ${totalOutstanding.toLocaleString()}
            </h2>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Pending and overdue accounts
            </span>
          </div>

          <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
              Receivable Rate
            </span>
            <h2 style={{ fontSize: "2rem", fontWeight: 600, color: "var(--text-primary)" }}>
              {collectionRate}%
            </h2>
            <div
              style={{
                width: "100%",
                height: "4px",
                background: "rgba(255, 255, 255, 0.05)",
                borderRadius: "2px",
                marginTop: "0.25rem",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${collectionRate}%`,
                  background: "var(--text-primary)",
                  borderRadius: "2px",
                }}
              />
            </div>
          </div>
        </div>

        {/* Filters and Search toolbar */}
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
              placeholder="Search invoices..."
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

        {/* Ledger Table */}
        {loading ? (
          <div className="glass-card" style={{ textAlign: "center", padding: "3rem 0" }}>
            <p style={{ color: "var(--text-secondary)" }}>Loading ledger records...</p>
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
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600 }}>No invoices found</h3>
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
                  <th>Client</th>
                  <th>Issued</th>
                  <th>Due</th>
                  <th>Amount</th>
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
                      <div>
                        <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{inv.clientName}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {inv.clientEmail}
                        </div>
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
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Create Invoice Modal Overlay */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.6)",
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
              maxWidth: "600px",
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "2rem",
              background: "var(--bg-secondary)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
              <div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Create Invoice</h2>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                  Fill in client statement parameters to publish a new invoice.
                </p>
              </div>
            </div>

            {modalError && (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  background: "var(--color-danger-bg)",
                  border: "1px solid var(--color-danger-border)",
                  borderRadius: "6px",
                  color: "var(--color-danger)",
                  fontSize: "0.85rem",
                  marginBottom: "1.25rem"
                }}
              >
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateInvoice}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Client Workspace</label>
                  <select
                    className="form-select"
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                  >
                    <option value="" style={{ background: "var(--bg-secondary)" }}>-- Select --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id} style={{ background: "var(--bg-secondary)" }}>
                        {c.name}
                      </option>
                    ))}
                    <option value="new" style={{ background: "var(--bg-secondary)" }}>+ New Client</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Client Name</label>
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
                <label className="form-label">Billing Email</label>
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
                <label className="form-label">Registered Address</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Street, City, ZIP, Country"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  disabled={selectedClientId !== "" && selectedClientId !== "new"}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Issue Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Line Items */}
              <div style={{ margin: "1.5rem 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <label className="form-label" style={{ margin: 0 }}>Itemized Charges</label>
                  <button
                    type="button"
                    onClick={handleAddItemLine}
                    className="btn btn-secondary"
                    style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem", borderRadius: "6px" }}
                  >
                    <span>Add Item</span>
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {items.map((item, index) => (
                    <div key={index} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
                      <div className="form-group" style={{ flex: 3, margin: 0 }}>
                        <input
                          type="text"
                          placeholder="Description"
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
                      <div className="form-group" style={{ width: "110px", margin: 0 }}>
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
                          padding: "0.6rem",
                          border: "1px solid var(--border-card)",
                          height: "38px",
                          width: "38px",
                          borderRadius: "6px",
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
                  borderTop: "1px solid var(--border-card)",
                  paddingTop: "1.25rem",
                  marginTop: "1.5rem",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.5rem",
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ borderRadius: "6px" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="btn btn-primary"
                  style={{ borderRadius: "6px" }}
                >
                  {modalLoading ? (
                    <span>Creating...</span>
                  ) : (
                    <span>Create Invoice</span>
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
