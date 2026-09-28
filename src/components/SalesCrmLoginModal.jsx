import { useState, useEffect, useRef } from "react";
import { fetchList } from "../api.js";
import logo from "../assets/zenve-zippy-logo.png";
import DoctorAvatar from "./DoctorAvatar.jsx";
import {
  Briefcase,
  UserCheck,
  Globe,
  User,
  Lock,
  Eye,
  EyeOff,
  Zap,
  ArrowRight,
  X,
  ShieldCheck,
  Check,
  Sparkles,
} from "lucide-react";
import "./SalesCrmLoginModal.css";

const ROLES_INFO = {
  executive: {
    key: "executive",
    title: "Sales Executive",
    shortTitle: "Executive",
    badge: "Field Operations",
    icon: Briefcase,
    tableKey: "sales_executives",
    themeClass: "role-executive",
    accentColor: "#007c71",
    accentBg: "rgba(0, 124, 113, 0.08)",
    accentBorder: "rgba(0, 124, 113, 0.22)",
    accentRing: "rgba(0, 124, 113, 0.18)",
    accentGradient: "linear-gradient(135deg, #007c71 0%, #0d9488 100%)",
    desc: "Manage doctor visits, pre/post call reports & monthly targets.",
    demoUser: "Vishnu",
    demoPass: "vk@2026",
  },
  manager: {
    key: "manager",
    title: "Sales Manager",
    shortTitle: "Manager",
    badge: "Team Management",
    icon: UserCheck,
    tableKey: "sales_managers",
    themeClass: "role-manager",
    accentColor: "#2563eb",
    accentBg: "rgba(37, 99, 235, 0.08)",
    accentBorder: "rgba(37, 99, 235, 0.22)",
    accentRing: "rgba(37, 99, 235, 0.18)",
    accentGradient: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
    desc: "Review executive performance, approve daily reports & monitor teams.",
    demoUser: "dhanushkodi",
    demoPass: "DK@2026",
  },
  regional: {
    key: "regional",
    title: "Regional Manager",
    shortTitle: "Regional",
    badge: "Regional Command",
    icon: Globe,
    tableKey: "regional_managers",
    themeClass: "role-regional",
    accentColor: "#7c3aed",
    accentBg: "rgba(124, 58, 237, 0.08)",
    accentBorder: "rgba(124, 58, 237, 0.22)",
    accentRing: "rgba(124, 58, 237, 0.18)",
    accentGradient: "linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)",
    desc: "High-level overview, target setting, regional analytics & plan approvals.",
    demoUser: "V Dhanushkodi",
    demoPass: "DK@2026",
  },
};

export default function SalesCrmLoginModal({
  isOpen,
  initialRole = "executive",
  onClose,
  onLoginSuccess,
}) {
  const [currentRole, setCurrentRole] = useState(initialRole || "executive");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [usersList, setUsersList] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  const usernameInputRef = useRef(null);
  const roleConfig = ROLES_INFO[currentRole] || ROLES_INFO.executive;
  const RoleIcon = roleConfig.icon;

  // Sync role when initialRole changes
  useEffect(() => {
    if (initialRole && ROLES_INFO[initialRole]) {
      setCurrentRole(initialRole);
    }
  }, [initialRole]);

  // Load available users for this role from API
  useEffect(() => {
    let cancelled = false;
    async function loadRoleUsers() {
      try {
        const list = await fetchList(roleConfig.tableKey);
        if (!cancelled && Array.isArray(list)) {
          setUsersList(list);
          if (list.length > 0 && !username) {
            setSelectedUser(list[0]);
          }
        }
      } catch (e) {
        if (!cancelled) setUsersList([]);
      }
    }
    loadRoleUsers();
    setError("");
    return () => {
      cancelled = true;
    };
  }, [currentRole, roleConfig.tableKey]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (usernameInputRef.current) usernameInputRef.current.focus();
      }, 120);
    }
  }, [isOpen, currentRole]);

  if (!isOpen) return null;

  function handleSelectQuickUser(u) {
    setSelectedUser(u);
    setUsername(u.name || u.code || "");
    setPassword(u.code || "123456");
    setError("");
  }

  function handleQuickFillDemo() {
    const demo =
      usersList.find((u) =>
        u.name?.toLowerCase().includes(roleConfig.demoUser.toLowerCase())
      ) || usersList[0];
    if (demo) {
      setSelectedUser(demo);
      setUsername(demo.name || demo.code || roleConfig.demoUser);
      setPassword(demo.code || roleConfig.demoPass);
    } else {
      setUsername(roleConfig.demoUser);
      setPassword(roleConfig.demoPass);
    }
    setError("");
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    setError("");

    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser) {
      setError("Please enter your username or employee code.");
      return;
    }
    if (!cleanPass) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const matched = usersList.find((u) => {
        const nameMatch = u.name && u.name.toLowerCase() === cleanUser.toLowerCase();
        const codeMatch = u.code && u.code.toLowerCase() === cleanUser.toLowerCase();
        const emailMatch = u.email && u.email.toLowerCase() === cleanUser.toLowerCase();
        return nameMatch || codeMatch || emailMatch;
      });

      const acceptedPasswords = [
        "123456",
        "admin123",
        "zenve@2026",
        "password",
        "admin",
        roleConfig.demoPass?.toLowerCase(),
      ];

      let isPasswordValid = false;

      if (matched) {
        if (matched.code && cleanPass.toLowerCase() === matched.code.toLowerCase()) {
          isPasswordValid = true;
        } else if (acceptedPasswords.includes(cleanPass.toLowerCase())) {
          isPasswordValid = true;
        } else if (cleanPass.length >= 4) {
          isPasswordValid = true;
        }
      } else {
        if (acceptedPasswords.includes(cleanPass.toLowerCase()) || cleanPass.length >= 4) {
          isPasswordValid = true;
        }
      }

      if (!isPasswordValid) {
        setError(
          `Incorrect password. (Hint: use code "${matched?.code || roleConfig.demoPass}" or 123456)`
        );
        setLoading(false);
        return;
      }

      const userToLogin = matched || {
        id: usersList[0]?.id || 1,
        name: cleanUser,
        code: cleanPass,
        email: `${cleanUser.replace(/\s+/g, "").toLowerCase()}@zenve.com`,
      };

      try {
        const onlineKey = "zippy_crm_online_users";
        const saved = localStorage.getItem(onlineKey);
        const map = saved ? JSON.parse(saved) : {};
        map[`${currentRole}_${userToLogin.id}`] = true;
        localStorage.setItem(onlineKey, JSON.stringify(map));
      } catch (err) {}

      if (rememberMe) {
        try {
          localStorage.setItem(
            "zippy_crm_active_auth",
            JSON.stringify({
              role: currentRole,
              user: userToLogin,
              loggedInAt: Date.now(),
            })
          );
        } catch (err) {}
      }

      setTimeout(() => {
        setLoading(false);
        if (onLoginSuccess) {
          onLoginSuccess({
            role: currentRole,
            user: userToLogin,
          });
        }
      }, 250);
    } catch (err) {
      setLoading(false);
      setError("An error occurred while logging in. Please try again.");
    }
  }

  return (
    <div
      className="crm-login-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div
        className={`crm-login-modal ${roleConfig.themeClass}`}
        style={{
          "--role-accent": roleConfig.accentColor,
          "--role-bg": roleConfig.accentBg,
          "--role-border": roleConfig.accentBorder,
          "--role-ring": roleConfig.accentRing,
          "--role-gradient": roleConfig.accentGradient,
        }}
      >
        {/* Top Gradient Highlight Bar */}
        <div className="crm-login-top-accent" />

        {/* Close Button */}
        {onClose && (
          <button
            type="button"
            className="crm-login-close-btn"
            onClick={onClose}
            title="Cancel & Return"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        )}

        {/* Header Section */}
        <div className="crm-login-header">
          <div className="crm-login-brand-row">
            <div className="crm-login-logo-box">
              <img src={logo} alt="Zenve Zippy" className="crm-login-logo-img" />
            </div>
            <div>
              <div className="crm-login-brand-title">
                Zenve Zippy CRM
                <span className="crm-login-brand-badge">SALES CRM</span>
              </div>
              <p className="crm-login-brand-sub">Secure Field & Team Operations Portal</p>
            </div>
          </div>

          {/* Segmented Role Tabs */}
          <div className="crm-login-role-tabs" role="tablist">
            {Object.values(ROLES_INFO).map((r) => {
              const TabIcon = r.icon;
              const isActive = currentRole === r.key;
              return (
                <button
                  key={r.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`crm-role-tab-btn ${isActive ? "active" : ""}`}
                  onClick={() => {
                    setCurrentRole(r.key);
                    setError("");
                  }}
                >
                  <TabIcon size={14} className="crm-role-tab-icon" />
                  <span>{r.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Role Banner */}
        <div className="crm-role-banner">
          <div className="crm-role-icon-box">
            <RoleIcon size={18} />
          </div>
          <div className="crm-role-banner-content">
            <div className="crm-role-banner-title">{roleConfig.title} Login</div>
            <div className="crm-role-banner-desc">{roleConfig.desc}</div>
          </div>
          <span className="crm-role-pill-badge">{roleConfig.badge}</span>
        </div>

        {/* Form Body */}
        <form className="crm-login-body" onSubmit={handleSubmit}>
          {error && (
            <div className="crm-login-error" role="alert">
              <ShieldCheck size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Username / Employee Code */}
          <div className="crm-login-form-group">
            <label className="crm-login-label">Username or Employee Code</label>
            <div className="crm-login-input-wrap">
              <span className="crm-login-field-icon">
                <User size={16} />
              </span>
              <input
                ref={usernameInputRef}
                type="text"
                className="crm-login-input"
                placeholder={`e.g. ${roleConfig.demoUser} or employee code`}
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError("");
                }}
                autoComplete="username"
              />
            </div>

            {/* Quick Profile Selection Chips */}
            {usersList.length > 0 && (
              <div className="crm-quick-users-wrap">
                <span className="crm-quick-user-label">Select profile:</span>
                <div className="crm-quick-users-scroll">
                  {usersList.slice(0, 4).map((u) => {
                    const isSelected =
                      selectedUser?.id === u.id &&
                      username.toLowerCase() === (u.name || "").toLowerCase();
                    return (
                      <button
                        key={u.id}
                        type="button"
                        className={`crm-quick-user-pill ${isSelected ? "selected" : ""}`}
                        onClick={() => handleSelectQuickUser(u)}
                        title={`Click to auto-fill ${u.name}`}
                      >
                        <DoctorAvatar name={u.name} size={18} showOnline={false} />
                        <span className="crm-quick-user-name">{u.name}</span>
                        {u.code && <span className="crm-quick-user-code">({u.code})</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Password Field */}
          <div className="crm-login-form-group">
            <div className="crm-login-label-row">
              <label className="crm-login-label">Password</label>
              <span className="crm-password-hint">
                Use code or <code>123456</code>
              </span>
            </div>
            <div className="crm-login-input-wrap">
              <span className="crm-login-field-icon">
                <Lock size={16} />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                className="crm-login-input"
                placeholder="Enter your security password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="crm-login-toggle-pw"
                onClick={() => setShowPassword((prev) => !prev)}
                title={showPassword ? "Hide password" : "Show password"}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Quick Credentials Auto-Fill Card */}
          <div className="crm-demo-hint-box">
            <div className="crm-demo-hint-left">
              <div className="crm-demo-spark-icon">
                <Zap size={14} />
              </div>
              <div className="crm-demo-hint-text">
                <span className="crm-demo-label">Quick credentials:</span>{" "}
                <strong>{roleConfig.demoUser}</strong> · Pass: <code>{roleConfig.demoPass}</code>
              </div>
            </div>
            <button
              type="button"
              className="crm-demo-fill-btn"
              onClick={handleQuickFillDemo}
              title="Click to automatically fill credentials"
            >
              <Sparkles size={12} />
              <span>Auto-Fill</span>
            </button>
          </div>

          {/* Keep Signed In Checkbox */}
          <label className="crm-remember-row">
            <input
              type="checkbox"
              className="crm-remember-input"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span className="crm-custom-checkbox">
              {rememberMe && <Check size={12} strokeWidth={3.5} />}
            </span>
            <span className="crm-remember-label">Keep me signed in for this role</span>
          </label>

          {/* Action Buttons */}
          <div className="crm-login-actions">
            <button
              type="submit"
              className="crm-login-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="crm-login-spinner" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Log In to {roleConfig.title} CRM</span>
                  <ArrowRight size={17} className="crm-submit-arrow" />
                </>
              )}
            </button>

            {onClose && (
              <button
                type="button"
                className="crm-login-cancel-btn"
                onClick={onClose}
              >
                Cancel &amp; Return to Admin CRM
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
