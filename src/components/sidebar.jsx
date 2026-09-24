import React, { useState, useRef } from "react";
import { NAV_GROUPS } from "../data.js";
import logo from "../assets/zenve-zippy-logo.png";
import NavIcon from "./NavIcon.jsx";
import DoctorAvatar from "./DoctorAvatar.jsx";
import {
  LayoutDashboard,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Briefcase,
  Settings,
  ShieldCheck,
  Activity,
  HeartPulse,
} from "lucide-react";
import "./Sidebar.css";

export default function Sidebar({
  currentKey,
  onSelect,
  activeTab = "data",
  onTabChange,
  onOpenSalesCRM,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState({
    Healthcare: true,
    Commerce: true,
    Sales: true,
    Administration: true,
  });

  const toggleGroup = (groupLabel) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupLabel]: !prev[groupLabel],
    }));
  };

  const isDashboardActive = activeTab === "dashboard";

  return (
    <aside className={`hc-sidebar ${isCollapsed ? "collapsed" : ""}`}>
      {/* ── Brand Header ── */}
      <div className="hc-sidebar-header">
        <div className="hc-brand-wrap">
          <div className="hc-brand-logo-frame">
            <img src={logo} alt="Zippy Logo" className="hc-brand-img" />
          </div>
          {!isCollapsed && (
            <div className="hc-brand-text">
              <div className="hc-brand-title-row">
                <span className="hc-brand-title">ZIPPY</span>
                <span className="hc-brand-chip">PRO</span>
              </div>
              <span className="hc-brand-subtitle">Healthcare CRM</span>
            </div>
          )}
        </div>

        <button
          type="button"
          className="hc-collapse-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* ── Navigation Items ── */}
      <nav className="hc-sidebar-nav">
        {/* Top-Level Dashboard */}
        <div className="hc-nav-group hc-nav-group-static">
          <button
            type="button"
            className={`hc-nav-item ${isDashboardActive ? "active" : ""}`}
            onClick={() => {
              if (onTabChange) onTabChange("dashboard");
            }}
            title={isCollapsed ? "Dashboard" : undefined}
          >
            <div className="hc-nav-item-icon">
              <LayoutDashboard size={18} />
            </div>
            {!isCollapsed && <span className="hc-nav-item-text">Dashboard</span>}
            {!isCollapsed && isDashboardActive && (
              <span className="hc-nav-active-pip" />
            )}
          </button>
        </div>

        {/* Collapsible Navigation Groups */}
        {NAV_GROUPS.map((group) => {
          const isOpen = openGroups[group.label] !== false;
          return (
            <div
              className={`hc-nav-group ${isOpen ? "group-open" : "group-closed"}`}
              key={group.label}
            >
              {!isCollapsed && (
                <button
                  type="button"
                  className="hc-group-heading"
                  onClick={() => toggleGroup(group.label)}
                  title={`Toggle ${group.label}`}
                >
                  <span className="hc-group-title">{group.label}</span>
                  <span className="hc-group-arrow">
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </span>
                </button>
              )}

              {(isOpen || isCollapsed) && (
                <div className="hc-group-items">
                  {group.items.map((item) => {
                    const isActive = !isDashboardActive && item.key === currentKey;
                    return (
                      <button
                        type="button"
                        key={item.key}
                        className={`hc-nav-item ${isActive ? "active" : ""}`}
                        onClick={() => {
                          if (onTabChange && activeTab === "dashboard") {
                            onTabChange("data");
                          }
                          onSelect(item.key);
                        }}
                        title={isCollapsed ? item.label : undefined}
                      >
                        <div className="hc-nav-item-icon">
                          <NavIcon name={item.key} size={18} />
                        </div>
                        {!isCollapsed && (
                          <span className="hc-nav-item-text">{item.label}</span>
                        )}
                        {!isCollapsed && isActive && (
                          <span className="hc-nav-active-pip" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* ── Sidebar Footer: Sales CRM Portal Switcher & User Profile ── */}
      <div className="hc-sidebar-footer">
        {onOpenSalesCRM && !isCollapsed && (
          <button
            type="button"
            className="hc-switch-sales-btn"
            onClick={() => onOpenSalesCRM("manager")}
            title="Open Sales CRM Portal"
          >
            <div className="hc-switch-sales-left">
              <Briefcase size={15} />
              <span>Sales CRM Portal</span>
            </div>
            <ArrowRight size={13} />
          </button>
        )}

        <div className={`hc-user-card ${isCollapsed ? "collapsed" : ""}`}>
          <DoctorAvatar name="Admin" size={isCollapsed ? 32 : 36} showOnline={true} isOnline={true} />
          {!isCollapsed && (
            <div className="hc-user-info">
              <span className="hc-user-name">Dr. Admin</span>
              <span className="hc-user-role">Clinical Director</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
