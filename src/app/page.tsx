"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader } from "@/components/Icons";

export default function LoginPage() {
  const { login, user } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in, redirect to correct dashboard
  useEffect(() => {
    if (user) {
      if (user.role === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/client/dashboard");
      }
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      let role: "admin" | "client" = "client";
      let clientProfileId = "client-acme";

      if (email.toLowerCase() === "admin@nexus.com") {
        role = "admin";
      } else if (email.toLowerCase() === "billing@globex.com") {
        role = "client";
        clientProfileId = "client-globex";
      } else if (email.toLowerCase() === "billing@acme.com") {
        role = "client";
        clientProfileId = "client-acme";
      } else {
        if (email.includes("nexus")) {
          role = "admin";
        } else if (email.includes("globex")) {
          role = "client";
          clientProfileId = "client-globex";
        } else {
          role = "client";
          clientProfileId = "client-acme";
        }
      }

      await login(email.toLowerCase(), role, clientProfileId);
    } catch (err) {
      setError("Authentication failed. Please check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string, role: "admin" | "client", profileId?: string) => {
    setError("");
    setIsSubmitting(true);
    setEmail(demoEmail);
    setPassword("••••••••••••");
    try {
      await login(demoEmail, role, profileId);
    } catch (err) {
      setError("Quick login failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        {/* Logo and Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "var(--text-primary)" }}>
            VaultPay
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            Nexus Corporate Services Gateway
          </p>
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
              marginBottom: "1.25rem"
            }}
          >
            <span>{error}</span>
          </div>
        )}

        {/* Access Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="billing@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group" style={{ marginBottom: "1.75rem" }}>
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", height: "42px", borderRadius: "6px" }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Loader size={16} className="animate-spin" />
                <span>Logging in...</span>
              </span>
            ) : (
              <span>Log In</span>
            )}
          </button>
        </form>

        {/* Security Evaluation Profiles */}
        <div
          style={{
            margin: "2rem 0 0 0",
            borderTop: "1px solid var(--border-card)",
            paddingTop: "1.5rem",
          }}
        >
          <p
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--text-muted)",
              marginBottom: "1rem",
              textAlign: "center",
            }}
          >
            Demo Accounts
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <button
              onClick={() => handleQuickLogin("admin@nexus.com", "admin")}
              disabled={isSubmitting}
              className="btn btn-secondary"
              style={{ 
                justifyContent: "space-between", 
                fontSize: "0.85rem", 
                padding: "0.6rem 1rem",
                borderRadius: "6px",
                textAlign: "left"
              }}
            >
              <div>
                <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>Evelyn Croft (Admin)</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "1px" }}>admin@nexus.com</div>
              </div>
            </button>

            <button
              onClick={() => handleQuickLogin("billing@acme.com", "client", "client-acme")}
              disabled={isSubmitting}
              className="btn btn-secondary"
              style={{ 
                justifyContent: "space-between", 
                fontSize: "0.85rem", 
                padding: "0.6rem 1rem",
                borderRadius: "6px",
                textAlign: "left"
              }}
            >
              <div>
                <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>Acme Corp (Client)</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "1px" }}>billing@acme.com</div>
              </div>
            </button>

            <button
              onClick={() => handleQuickLogin("billing@globex.com", "client", "client-globex")}
              disabled={isSubmitting}
              className="btn btn-secondary"
              style={{ 
                justifyContent: "space-between", 
                fontSize: "0.85rem", 
                padding: "0.6rem 1rem",
                borderRadius: "6px",
                textAlign: "left"
              }}
            >
              <div>
                <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>Globex Corp (Client)</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "1px" }}>billing@globex.com</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
