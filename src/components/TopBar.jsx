import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Plus,
  Bell,
  HelpCircle,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Sun,
  Moon,
  Briefcase,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { useTheme } from "../useTheme.js";
import DoctorAvatar from "./DoctorAvatar.jsx";
import "./TopBar.css";

export default function TopBar({
  title = "Dashboard",
  breadcrumb = "Healthcare / Overview",
  searchTerm = "",
  onSearchChange = () => {},
  onQuickAdd = () => {},
  activeTab = "dashboard",
  onTabChange = () => {},
  onOpenSalesCRM = () => {},
  theme: propTheme,
  onThemeChange: propOnThemeChange,
}) {
  const [internalTheme, setInternalTheme] = useTheme();
  const theme = propTheme !== undefined ? propTheme : internalTheme;
  const setTheme = propOnThemeChange || setInternalTheme;

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl+K / Cmd+K for search
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <header className="hc-topbar">
      {/* ── LEFT: Page Title & Breadcrumb ── */}
      <div className="hc-topbar-left">
        <div className="hc-topbar-breadcrumb">
          <span className="hc-bc-item">Zippy CRM</span>
          <ChevronRight size={12} className="hc-bc-sep" />
          <span className="hc-bc-item hc-bc-active">{title}</span>
        </div>
        <h1 className="hc-topbar-title">{title}</h1>
      </div>

      {/* ── CENTER: Large Global Search ── */}
      <div className="hc-topbar-center">
        <div className="hc-global-search">
          <Search size={16} className="hc-search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            className="hc-search-input"
            placeholder="Search doctors, pets, appointments..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <kbd className="hc-search-kbd">⌘K</kbd>
        </div>
      </div>

      {/* ── RIGHT: Quick Add, Help, Notifications, Profile ── */}
      <div className="hc-topbar-right" ref={dropdownRef}>
        {/* Quick Add Button */}
        <button
          type="button"
          className="hc-btn-quick-add"
          onClick={onQuickAdd}
          title="Quick Add Record"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Quick Add</span>
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          className="hc-icon-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} mode`}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Notifications */}
        <div className="hc-notif-wrap">
          <button
            type="button"
            className="hc-icon-btn"
            onClick={() => {
              setNotificationsOpen((prev) => !prev);
              setProfileDropdownOpen(false);
            }}
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell size={17} />
            {unreadCount > 0 && <span className="hc-badge-dot" />}
          </button>

          {notificationsOpen && (
            <div className="hc-dropdown-menu hc-notif-menu">
              <div className="hc-menu-header">
                <span className="hc-menu-title">Notifications</span>
                <span className="hc-badge-count">{unreadCount} new</span>
              </div>
              <div className="hc-notif-list">
                <div className="hc-notif-item unread">
                  <div className="hc-notif-dot" />
                  <div className="hc-notif-content">
                    <p className="hc-notif-text">
                      <strong>Dr. Priya Kumar</strong> completed surgery on <strong>Bruno</strong>
                    </p>
                    <span className="hc-notif-time">10m ago</span>
                  </div>
                </div>
                <div className="hc-notif-item unread">
                  <div className="hc-notif-dot" />
                  <div className="hc-notif-content">
                    <p className="hc-notif-text">
                      New appointment confirmed for <strong>Bella</strong> at 2:00 PM
                    </p>
                    <span className="hc-notif-time">32m ago</span>
                  </div>
                </div>
                <div className="hc-notif-item">
                  <div className="hc-notif-dot read" />
                  <div className="hc-notif-content">
                    <p className="hc-notif-text">
                      Inventory alert: <strong>Amoxicillin</strong> stock below 15 units
                    </p>
                    <span className="hc-notif-time">2h ago</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Help Icon */}
        <button
          type="button"
          className="hc-icon-btn"
          onClick={() => {
            alert("Zenve Zippy Healthcare Helpdesk: Reach out to support@zenvezippy.com or clinical support line +91 80 4000 8000.");
          }}
          title="Clinical Support & Helpdesk"
          aria-label="Help"
        >
          <HelpCircle size={17} />
        </button>

        {/* User Profile Pill & Dropdown */}
        <div className="hc-profile-wrap">
          <button
            type="button"
            className="hc-profile-trigger"
            onClick={() => {
              setProfileDropdownOpen((prev) => !prev);
              setNotificationsOpen(false);
            }}
            aria-expanded={profileDropdownOpen}
          >
            <DoctorAvatar name="Admin" size={32} showOnline={true} isOnline={true} />
            <div className="hc-profile-text">
              <span className="hc-profile-name">Dr. Admin</span>
              <span className="hc-profile-role">Clinic Admin</span>
            </div>
            <ChevronDown size={14} className="hc-profile-arrow" />
          </button>

          {profileDropdownOpen && (
            <div className="hc-dropdown-menu hc-profile-menu">
              <div className="hc-profile-header">
                <DoctorAvatar name="Admin" size={40} />
                <div className="hc-profile-meta">
                  <span className="hc-profile-head-name">Dr. Admin</span>
                  <span className="hc-profile-head-email">admin@zenvezippy.com</span>
                </div>
              </div>

              <div className="hc-menu-divider" />

              <button
                type="button"
                className="hc-menu-item"
                onClick={() => {
                  setProfileDropdownOpen(false);
                  alert("Opening My Profile details...");
                }}
              >
                <User size={15} />
                <span>My Profile</span>
              </button>

              <button
                type="button"
                className="hc-menu-item"
                onClick={() => {
                  setProfileDropdownOpen(false);
                  if (onTabChange) onTabChange("data");
                }}
              >
                <Settings size={15} />
                <span>Account Settings</span>
              </button>

              <button
                type="button"
                className="hc-menu-item"
                onClick={() => {
                  setProfileDropdownOpen(false);
                  onOpenSalesCRM?.("manager");
                }}
              >
                <Briefcase size={15} />
                <span>Switch to Sales CRM</span>
              </button>

              <div className="hc-menu-divider" />

              <button
                type="button"
                className="hc-menu-item danger"
                onClick={() => {
                  setProfileDropdownOpen(false);
                  if (window.confirm("Do you want to log out of Zenve Zippy Healthcare CRM?")) {
                    localStorage.removeItem("zippy_crm_last_view");
                    localStorage.removeItem("zippy_crm_active_auth");
                    window.location.reload();
                  }
                }}
              >
                <LogOut size={15} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
