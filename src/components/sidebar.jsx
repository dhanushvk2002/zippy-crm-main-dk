import { useRef } from "react";
import { NAV_GROUPS } from "../data.js";
import logo from "../assets/zenve-zippy-logo.png";
import { LogOut } from "lucide-react";

export default function Sidebar({ currentKey, onSelect, adminUser, onLogout }) {
  const navRef = useRef(null);

  return (
    <aside className="zzc-sidebar">

      {/* Header Area */}
      <div className="zzc-sidebar-header">
        <div className="zzc-logo">
          <img src={logo} alt="Zenve Zippy" />
        </div>

        <div>
          <p className="zzc-brand-title">
            Zenve Zippy CRM
          </p>

          <p className="zzc-brand-sub">
            Cloud control center
          </p>
        </div>
      </div>

      <nav className="zzc-nav" ref={navRef}>
        {NAV_GROUPS.map((group) => (
          <div
            className="zzc-nav-group"
            key={group.label}
          >
            <p className="zzc-nav-group-label">
              {group.label}
            </p>

            {group.items.map((item) => (
              <button
                type="button"
                key={item.key}
                className={
                  "zzc-nav-btn" +
                  (item.key === currentKey ? " active" : "")
                }
                onClick={() => onSelect(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer Profile & Logout */}
      {adminUser && onLogout && (
        <div
          style={{
            padding: "12px 14px",
            borderTop: "1px solid var(--sidebar-border, #e2e8f0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(255, 255, 255, 0.4)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #0284c7, #0d9488)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: "bold",
                flexShrink: 0,
              }}
            >
              {(adminUser.name || adminUser.email || "A").charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--foreground, #0f172a)",
                  margin: 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {adminUser.name || "Administrator"}
              </p>
              <p
                style={{
                  fontSize: "10px",
                  color: "#64748b",
                  margin: 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {adminUser.email || "admin@zenvezippy.com"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            title="Log out"
            style={{
              padding: "6px",
              borderRadius: "6px",
              color: "#94a3b8",
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#e11d48";
              e.currentTarget.style.background = "#fee2e2";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#94a3b8";
              e.currentTarget.style.background = "transparent";
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      )}

    </aside>
  );
}
