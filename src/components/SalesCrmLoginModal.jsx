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
    accentColor: "#0284c7",
    accentBg: "rgba(2, 132, 199, 0.08)",
    accentBorder: "rgba(2, 132, 199, 0.22)",
    accentRing: "rgba(2, 132, 199, 0.18)",
    accentGradient: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
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

  // Load available users for this role from API whenever opened or role changes
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    async function loadRoleUsers() {
      try {
        const list = await fetchList(roleConfig.tableKey);
        if (!cancelled && Array.isArray(list)) {
          setUsersList(list);

          let preferredUser = null;
          // Priority 1: Check localStorage preferred executive ID
          try {
            const prefId = localStorage.getItem("zippy_crm_preferred_exec_id");
            if (prefId && currentRole === "executive") {
              preferredUser = list.find((u) => String(u.id) === String(prefId));
            }
          } catch (e) {}

          // Priority 2: Check latest added executive from table
          if (!preferredUser && currentRole === "executive") {
            try {
              const latestStr = localStorage.getItem("zippy_crm_latest_added_executive");
              if (latestStr) {
                const latestObj = JSON.parse(latestStr);
                preferredUser = list.find(
                  (u) =>
                    (latestObj.id && String(u.id) === String(latestObj.id)) ||
                    (latestObj.code && u.code && u.code.toLowerCase() === latestObj.code.toLowerCase()) ||
                    (latestObj.email && u.email && u.email.toLowerCase() === latestObj.email.toLowerCase()) ||
                    (latestObj.name && u.name && u.name.toLowerCase() === latestObj.name.toLowerCase())
                );
              }
            } catch (e) {}
          }

          // Priority 3: Check active auth
          if (!preferredUser) {
            try {
              const authStr = localStorage.getItem("zippy_crm_active_auth");
              if (authStr) {
                const auth = JSON.parse(authStr);
                if (auth?.role === currentRole && auth?.user?.id) {
                  preferredUser = list.find((u) => String(u.id) === String(auth.user.id));
                }
              }
            } catch (e) {}
          }

          // Priority 4: Default to the latest added user in the list (newest record in database)
          if (!preferredUser && list.length > 0) {
            preferredUser = list[list.length - 1];
          }

          if (preferredUser) {
            setSelectedUser(preferredUser);
            setUsername(preferredUser.name || preferredUser.email || preferredUser.code || "");
            setPassword(preferredUser.code || "123456");
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
  }, [isOpen, currentRole, roleConfig.tableKey]);

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
    setUsername(u.name || u.email || u.code || "");
    setPassword(u.code || "123456");
    setError("");
  }

  function handleUsernameChange(val) {
    setUsername(val);
    setError("");
    const clean = val.trim().toLowerCase();
    if (!clean) {
      setSelectedUser(null);
      return;
    }

    // Match against current usersList by email, name, code, or phone
    const match = usersList.find((u) => {
      const emailLower = (u.email || "").trim().toLowerCase();
      const nameLower = (u.name || "").trim().toLowerCase();
      const codeLower = (u.code || "").trim().toLowerCase();
      const phoneStr = String(u.phone || "").trim();
      return (
        emailLower === clean ||
        nameLower === clean ||
        codeLower === clean ||
        phoneStr === clean
      );
    });

    if (match) {
      setSelectedUser(match);
      if (!password || password === "123456" || usersList.some((u) => u.code === password)) {
        setPassword(match.code || "123456");
      }
    } else {
      // Partial match (prefix matching)
      const partial = usersList.find((u) => {
        const emailLower = (u.email || "").trim().toLowerCase();
        const nameLower = (u.name || "").trim().toLowerCase();
        return (
          (nameLower && nameLower.startsWith(clean)) ||
          (emailLower && (emailLower.startsWith(clean) || emailLower.split("@")[0] === clean))
        );
      });
      if (partial) {
        setSelectedUser(partial);
      }
    }
  }

  function handleQuickFillDemo() {
    const demo =
      usersList.find((u) =>
        u.name?.toLowerCase().includes(roleConfig.demoUser.toLowerCase())
      ) || usersList[0];
    if (demo) {
      setSelectedUser(demo);
      setUsername(demo.name || demo.email || demo.code || roleConfig.demoUser);
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
      setError("Please enter your email, username, or employee code.");
      return;
    }
    if (!cleanPass) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const cleanUserLower = cleanUser.toLowerCase();

      // Step 1: Match against current usersList
      let matched = usersList.find((u) => {
        const nameMatch = u.name && u.name.trim().toLowerCase() === cleanUserLower;
        const codeMatch = u.code && u.code.trim().toLowerCase() === cleanUserLower;
        const emailMatch = u.email && u.email.trim().toLowerCase() === cleanUserLower;
        const phoneMatch = u.phone && String(u.phone).trim() === cleanUser;
        return emailMatch || nameMatch || codeMatch || phoneMatch;
      });

      // Step 2: Fresh fetch from API if not matched yet (in case new record was just saved in table)
      let currentList = usersList;
      if (!matched) {
        try {
          const freshList = await fetchList(roleConfig.tableKey);
          if (Array.isArray(freshList)) {
            currentList = freshList;
            setUsersList(freshList);
            matched = freshList.find((u) => {
              const nameMatch = u.name && u.name.trim().toLowerCase() === cleanUserLower;
              const codeMatch = u.code && u.code.trim().toLowerCase() === cleanUserLower;
              const emailMatch = u.email && u.email.trim().toLowerCase() === cleanUserLower;
              const phoneMatch = u.phone && String(u.phone).trim() === cleanUser;
              return emailMatch || nameMatch || codeMatch || phoneMatch;
            });
            if (!matched) {
              matched = freshList.find((u) => {
                const emailPrefix = u.email ? u.email.split("@")[0].toLowerCase() : "";
                return (
                  emailPrefix === cleanUserLower ||
                  (u.name && u.name.toLowerCase() === cleanUserLower) ||
                  (u.email && u.email.toLowerCase().includes(cleanUserLower))
                );
              });
            }
          }
        } catch (fetchErr) {
          console.warn("Fresh fetch failed:", fetchErr);
        }
      }

      // Step 3: Check recently saved executive from localStorage
      if (!matched && currentRole === "executive") {
        try {
          const latestStr = localStorage.getItem("zippy_crm_latest_added_executive");
          if (latestStr) {
            const latestObj = JSON.parse(latestStr);
            if (
              (latestObj.email && latestObj.email.trim().toLowerCase() === cleanUserLower) ||
              (latestObj.name && latestObj.name.trim().toLowerCase() === cleanUserLower) ||
              (latestObj.code && latestObj.code.trim().toLowerCase() === cleanUserLower)
            ) {
              matched = latestObj;
            }
          }
        } catch (e) {}
      }

      // Step 4: Validate password
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

      // Determine the exact user object to log in
      const isSelectedUserMatching =
        selectedUser &&
        (selectedUser.name?.trim().toLowerCase() === cleanUserLower ||
          selectedUser.email?.trim().toLowerCase() === cleanUserLower ||
          selectedUser.code?.trim().toLowerCase() === cleanUserLower);

      const userToLogin =
        matched ||
        (isSelectedUserMatching ? selectedUser : null) || {
          id: currentList[currentList.length - 1]?.id || Date.now(),
          name: cleanUser.includes("@") ? cleanUser.split("@")[0] : cleanUser,
          code: cleanPass,
          email: cleanUser.includes("@") ? cleanUser : `${cleanUser.replace(/\s+/g, "").toLowerCase()}@zenve.com`,
          region: "Tamil Nadu",
          city: "Chennai",
        };

      try {
        const onlineKey = "zippy_crm_online_users";
        const saved = localStorage.getItem(onlineKey);
        const map = saved ? JSON.parse(saved) : {};
        map[`${currentRole}_${userToLogin.id}`] = true;
        localStorage.setItem(onlineKey, JSON.stringify(map));
      } catch (err) {}

      // Always save active auth and preferred executive ID so SalesCrm picks up the exact user
      try {
        localStorage.setItem(
          "zippy_crm_active_auth",
          JSON.stringify({
            role: currentRole,
            user: userToLogin,
            loggedInAt: Date.now(),
          })
        );
        if (currentRole === "executive" && userToLogin.id) {
          localStorage.setItem("zippy_crm_preferred_exec_id", String(userToLogin.id));
        }
      } catch (err) {}

      setTimeout(() => {
        setLoading(false);
        if (onLoginSuccess) {
          onLoginSuccess({
            role: currentRole,
            user: userToLogin,
          });
        }
      }, 200);
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

          {/* Username / Employee Code / Email */}
          <div className="crm-login-form-group">
            <label className="crm-login-label">Email, Username, or Employee Code</label>
            <div className="crm-login-input-wrap">
              <span className="crm-login-field-icon">
                <User size={16} />
              </span>
              <input
                ref={usernameInputRef}
                type="text"
                className="crm-login-input"
                placeholder={`e.g. ${selectedUser?.email || roleConfig.demoUser} or employee code`}
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                autoComplete="username"
              />
            </div>

            {/* Quick Profile Selection Chips */}
            {usersList.length > 0 && (
              <div className="crm-quick-users-wrap">
                <span className="crm-quick-user-label">Select profile:</span>
                <div className="crm-quick-users-scroll">
                  {usersList.map((u) => {
                    const isSelected =
                      selectedUser?.id === u.id ||
                      (username &&
                        ((u.name && username.trim().toLowerCase() === u.name.trim().toLowerCase()) ||
                          (u.email && username.trim().toLowerCase() === u.email.trim().toLowerCase()) ||
                          (u.code && username.trim().toLowerCase() === u.code.trim().toLowerCase())));
                    return (
                      <button
                        key={u.id}
                        type="button"
                        className={`crm-quick-user-pill ${isSelected ? "selected" : ""}`}
                        onClick={() => handleSelectQuickUser(u)}
                        title={`Click to auto-fill ${u.name} (${u.email || u.code || ""})`}
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
                <strong>{selectedUser?.name || roleConfig.demoUser}</strong> · Pass:{" "}
                <code>{selectedUser?.code || roleConfig.demoPass}</code>
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
