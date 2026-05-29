"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Lock, Shield, User, Building, ArrowRight, Loader } from "@/components/Icons";

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
      setError("Please enter your corporate email address.");
      return;
    }
    if (!password) {
      setError("Please enter your security access password.");
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
      setError("Quick security handshake failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        {/* Logo and Header */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "2.5rem" }}>
          <div 
            style={{ 
              width: "60px", 
              height: "60px", 
              borderRadius: "16px", 
              background: "linear-gradient(135deg, var(--color-primary), #6d28d9)", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              boxShadow: "0 8px 20px var(--color-primary-glow)",
              marginBottom: "1.25rem"
            }}
          >
            <Shield size={32} style={{ color: "white" }} />
          </div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
            VaultPay Core
          </h2>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "0.25rem", fontWeight: 500 }}>
            Nexus Corporate Services Gateway
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: "1rem",
              background: "var(--color-danger-bg)",
              border: "1px solid var(--color-danger-border)",
              borderRadius: "12px",
              color: "var(--color-danger)",
              fontSize: "0.875rem",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}
          >
            <span style={{ fontWeight: 500 }}>{error}</span>
          </div>
        )}

        {/* Access Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Corporate Email</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex" }}>
                <User size={18} />
              </span>
              <input
                type="email"
                className="form-input"
                placeholder="e.g., billing@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                style={{ paddingLeft: "42px" }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: "2rem" }}>
            <label className="form-label">Access Password</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex" }}>
                <Lock size={18} />
              </span>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                style={{ paddingLeft: "42px" }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", height: "48px", gap: "0.75rem", borderRadius: "12px" }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader size={18} className="animate-spin" />
                <span>Verifying secure handshake...</span>
              </>
            ) : (
              <>
                <span>Establish Session</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Security Evaluation Profiles */}
        <div
          style={{
            margin: "2.5rem 0 0 0",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            paddingTop: "2rem",
          }}
        >
          <p
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--text-muted)",
              marginBottom: "1.25rem",
              textAlign: "center",
            }}
          >
            Security Evaluation Profiles
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <button
              onClick={() => handleQuickLogin("admin@nexus.com", "admin")}
              disabled={isSubmitting}
              className="btn btn-secondary"
              style={{ 
                justifyContent: "space-between", 
                fontSize: "0.85rem", 
                padding: "0.75rem 1.2rem",
                borderRadius: "12px",
                textAlign: "left"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <Shield size={16} style={{ color: "var(--color-primary-hover)" }} />
                <div>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>Evelyn Croft (Admin)</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>admin@nexus.com</div>
                </div>
              </div>
              <span style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem", borderRadius: "6px", background: "rgba(139, 92, 246, 0.15)", color: "var(--color-primary-hover)", fontWeight: 700 }}>
                CFO KEY
              </span>
            </button>

            <button
              onClick={() => handleQuickLogin("billing@acme.com", "client", "client-acme")}
              disabled={isSubmitting}
              className="btn btn-secondary"
              style={{ 
                justifyContent: "space-between", 
                fontSize: "0.85rem", 
                padding: "0.75rem 1.2rem",
                borderRadius: "12px",
                textAlign: "left"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <Building size={16} style={{ color: "var(--color-success)" }} />
                <div>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>Acme Corp (Client)</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>billing@acme.com</div>
                </div>
              </div>
              <span style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem", borderRadius: "6px", background: "rgba(16, 185, 129, 0.15)", color: "var(--color-success)", fontWeight: 700 }}>
                CLIENT KEY
              </span>
            </button>

            <button
              onClick={() => handleQuickLogin("billing@globex.com", "client", "client-globex")}
              disabled={isSubmitting}
              className="btn btn-secondary"
              style={{ 
                justifyContent: "space-between", 
                fontSize: "0.85rem", 
                padding: "0.75rem 1.2rem",
                borderRadius: "12px",
                textAlign: "left"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <Building size={16} style={{ color: "var(--color-success)" }} />
                <div>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>Globex Corp (Client)</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>billing@globex.com</div>
                </div>
              </div>
              <span style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem", borderRadius: "6px", background: "rgba(16, 185, 129, 0.15)", color: "var(--color-success)", fontWeight: 700 }}>
                CLIENT KEY
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
