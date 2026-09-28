import React, { useState } from "react";
import {
  Users,
  Calendar,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Activity,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  MoreVertical,
  CalendarDays,
  ShieldCheck,
  FileText,
  Stethoscope,
  ShoppingBag,
  Package,
  Layers,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Plus,
  Compass,
  Check,
  Timer,
  LogIn,
} from "lucide-react";
import DoctorAvatar from "./DoctorAvatar.jsx";
import StylizedEyeIcon from "./StylizedEyeIcon.jsx";
import promoDogImg from "../assets/golden-retriever-promo.jpg";
import "./MasterEnterpriseDashboard.css";

// Mini Sparkline SVG component
function Sparkline({ color, points = [12, 18, 14, 22, 19, 28, 25, 34] }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const w = 120;
  const h = 26;

  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((p - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  });

  return (
    <svg className="med-stat-sparkline" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coords.join(" ")}
      />
    </svg>
  );
}

export default function MasterEnterpriseDashboard({
  data = {},
  currentRecord = null,
  role = "manager",
  onGoToDoctors = () => {},
  onGoToAttendance = () => {},
  onGoToPlan = () => {},
  onGoToReports = () => {},
  onAddDoctor = () => {},
  onViewDoctor = () => {},
}) {
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const [salesRange, setSalesRange] = useState("Last 30 Days");
  const [regionRange, setRegionRange] = useState("Last 30 Days");
  const [attendRange, setAttendRange] = useState("This Month");

  // Determine user display name
  const userName = currentRecord?.name || "Dhanush Kodi";
  const userTitle = role === "regional" ? "Regional Manager" : role === "executive" ? "Sales Executive" : "Sales Manager";

  // Real or benchmark numbers
  const totalDoctors = data.doctors?.length || 128;
  const totalPetParents = data.petParents?.length || 362;
  const totalPets = data.pets?.length || 1248;
  const totalProducts = data.products?.length || 892;
  const totalOrders = data.orders?.length || 247;
  const totalRevenue = "₹ 5,42,000";
  const pendingApprovals = 12;

  // Recent doctors list from API or benchmark
  const recentDoctors = (data.doctors && data.doctors.length > 0)
    ? data.doctors.slice(0, 4).map((d, i) => ({
        id: d.id,
        name: d.name,
        specialization: d.specializations || d.qualification || "Veterinary Surgeon",
        location: d.city || "Chennai",
        status: (d.is_active === "Yes" || d.is_active === true || i < 3) ? "Active" : "Inactive",
        lastVisit: `Sep ${23 - i}, 2026`,
        rawDoc: d,
      }))
    : [
        { id: 1, name: "Dr. Rajesh Kumar", specialization: "Veterinary Surgeon", location: "Chennai", status: "Active", lastVisit: "Sep 23, 2026" },
        { id: 2, name: "Dr. Priya Sharma", specialization: "Dermatologist", location: "Bengaluru", status: "Active", lastVisit: "Sep 22, 2026" },
        { id: 3, name: "Dr. Suresh Babu", specialization: "General Physician", location: "Coimbatore", status: "Active", lastVisit: "Sep 21, 2026" },
        { id: 4, name: "Dr. Anitha R", specialization: "Cardiologist", location: "Hyderabad", status: "Inactive", lastVisit: "Sep 18, 2026" },
      ];

  // SVG Area Chart points for Sales Performance
  // Points: Sep 1: 10k, Sep 5: 16k, Sep 10: 12k, Sep 15: 23k, Sep 20: 21k, Sep 24: 38k
  const chartPoints = [
    { x: 30, y: 135, label: "Sep 1", val: "10k" },
    { x: 100, y: 110, label: "Sep 5", val: "16k" },
    { x: 170, y: 125, label: "Sep 10", val: "12k" },
    { x: 240, y: 80, label: "Sep 15", val: "23k" },
    { x: 310, y: 90, label: "Sep 20", val: "21k" },
    { x: 380, y: 30, label: "Sep 24", val: "38k" },
  ];

  const polylineStr = chartPoints.map(p => `${p.x},${p.y}`).join(" ");
  const polygonStr = `30,160 ${polylineStr} 380,160`;

  return (
    <div className="med-dashboard-wrap">
      {/* ── 1. Greeting & Welcome Banner ── */}
      <div className="med-welcome-banner">
        <div className="med-welcome-left">
          <div className="med-greeting-row">
            <span className="med-greeting-emoji">👋</span>
            <h1 className="med-greeting-title">Good morning, {userName}</h1>
          </div>
          <p className="med-greeting-sub">
            Here's what's happening across your Zenve Zippy CRM today.
          </p>
        </div>

        <div className="med-welcome-right">
          <div className="med-date-pill" title="Current reporting date">
            <Calendar size={15} style={{ color: "var(--primary, #007c71)" }} />
            <span>Thu, Sep 24, 2026</span>
            <ChevronDown size={14} style={{ color: "#94a3b8" }} />
          </div>

          <div style={{ position: "relative" }}>
            <button
              type="button"
              className="med-quick-btn"
              onClick={() => setQuickMenuOpen(!quickMenuOpen)}
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>Quick Actions</span>
              <ChevronDown size={14} />
            </button>

            {quickMenuOpen && (
              <div className="med-quick-menu-dropdown">
                <button
                  type="button"
                  className="med-quick-item"
                  onClick={() => {
                    setQuickMenuOpen(false);
                    onAddDoctor();
                  }}
                >
                  <Stethoscope size={15} style={{ color: "#007c71" }} />
                  <span>Add New Doctor</span>
                </button>
                <button
                  type="button"
                  className="med-quick-item"
                  onClick={() => {
                    setQuickMenuOpen(false);
                    onGoToAttendance();
                  }}
                >
                  <Clock size={15} style={{ color: "#0d9488" }} />
                  <span>Punch Attendance Shift</span>
                </button>
                <button
                  type="button"
                  className="med-quick-item"
                  onClick={() => {
                    setQuickMenuOpen(false);
                    onGoToReports();
                  }}
                >
                  <FileText size={15} style={{ color: "#2563eb" }} />
                  <span>Submit Daily Report</span>
                </button>
                <button
                  type="button"
                  className="med-quick-item"
                  onClick={() => {
                    setQuickMenuOpen(false);
                    onGoToPlan();
                  }}
                >
                  <CalendarDays size={15} style={{ color: "#ea580c" }} />
                  <span>Plan Territory Visits</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. Top Row of 4 Stat Cards ── */}
      <div className="med-kpi-grid-top">
        {/* Total Doctors */}
        <div className="med-stat-card" onClick={onGoToDoctors} style={{ cursor: "pointer" }}>
          <div className="med-stat-top">
            <div className="med-stat-icon-badge blue">
              <Users size={20} />
            </div>
            <div className="med-stat-meta">
              <span className="med-stat-label">Total Doctors</span>
              <span className="med-stat-value">{totalDoctors.toLocaleString()}</span>
            </div>
          </div>
          <div className="med-stat-trend-row">
            <span className="med-stat-trend-tag up">
              <TrendingUp size={13} /> 8.4%
            </span>
            <span className="med-stat-vs">vs last month</span>
          </div>
          <Sparkline color="#0284c7" points={[100, 108, 105, 114, 112, 122, 128]} />
        </div>

        {/* Pet Parents */}
        <div className="med-stat-card">
          <div className="med-stat-top">
            <div className="med-stat-icon-badge green">
              <Sparkles size={20} />
            </div>
            <div className="med-stat-meta">
              <span className="med-stat-label">Pet Parents</span>
              <span className="med-stat-value">{totalPetParents.toLocaleString()}</span>
            </div>
          </div>
          <div className="med-stat-trend-row">
            <span className="med-stat-trend-tag up">
              <TrendingUp size={13} /> 6.2%
            </span>
            <span className="med-stat-vs">vs last month</span>
          </div>
          <Sparkline color="#16a34a" points={[310, 325, 320, 338, 342, 355, 362]} />
        </div>

        {/* Total Pets */}
        <div className="med-stat-card">
          <div className="med-stat-top">
            <div className="med-stat-icon-badge purple">
              <Activity size={20} />
            </div>
            <div className="med-stat-meta">
              <span className="med-stat-label">Total Pets</span>
              <span className="med-stat-value">{totalPets.toLocaleString()}</span>
            </div>
          </div>
          <div className="med-stat-trend-row">
            <span className="med-stat-trend-tag up">
              <TrendingUp size={13} /> 9.3%
            </span>
            <span className="med-stat-vs">vs last month</span>
          </div>
          <Sparkline color="#9333ea" points={[1050, 1090, 1120, 1150, 1180, 1210, 1248]} />
        </div>

        {/* Products */}
        <div className="med-stat-card">
          <div className="med-stat-top">
            <div className="med-stat-icon-badge orange">
              <Package size={20} />
            </div>
            <div className="med-stat-meta">
              <span className="med-stat-label">Products</span>
              <span className="med-stat-value">{totalProducts.toLocaleString()}</span>
            </div>
          </div>
          <div className="med-stat-trend-row">
            <span className="med-stat-trend-tag up">
              <TrendingUp size={13} /> 5.1%
            </span>
            <span className="med-stat-vs">vs last month</span>
          </div>
          <Sparkline color="#ea580c" points={[820, 835, 845, 850, 870, 882, 892]} />
        </div>
      </div>

      {/* ── 3. Bottom Row of 3 Stat Cards ── */}
      <div className="med-kpi-grid-bottom">
        {/* Orders */}
        <div className="med-stat-card">
          <div className="med-stat-top">
            <div className="med-stat-icon-badge pink">
              <ShoppingBag size={20} />
            </div>
            <div className="med-stat-meta">
              <span className="med-stat-label">Orders</span>
              <span className="med-stat-value">{totalOrders.toLocaleString()}</span>
            </div>
          </div>
          <div className="med-stat-trend-row">
            <span className="med-stat-trend-tag up">
              <TrendingUp size={13} /> 11.2%
            </span>
            <span className="med-stat-vs">vs last month</span>
          </div>
          <Sparkline color="#e11d48" points={[190, 205, 212, 220, 230, 238, 247]} />
        </div>

        {/* Revenue */}
        <div className="med-stat-card">
          <div className="med-stat-top">
            <div className="med-stat-icon-badge emerald">
              <span style={{ fontSize: "1.15rem", fontWeight: 800 }}>₹</span>
            </div>
            <div className="med-stat-meta">
              <span className="med-stat-label">Revenue</span>
              <span className="med-stat-value">{totalRevenue}</span>
            </div>
          </div>
          <div className="med-stat-trend-row">
            <span className="med-stat-trend-tag up">
              <TrendingUp size={13} /> 14.8%
            </span>
            <span className="med-stat-vs">vs last month</span>
          </div>
          <Sparkline color="#059669" points={[420, 440, 460, 475, 495, 520, 542]} />
        </div>

        {/* Pending Approvals */}
        <div className="med-stat-card" onClick={onGoToPlan} style={{ cursor: "pointer" }}>
          <div className="med-stat-top">
            <div className="med-stat-icon-badge red">
              <FileText size={20} />
            </div>
            <div className="med-stat-meta">
              <span className="med-stat-label">Pending Approvals</span>
              <span className="med-stat-value">{pendingApprovals}</span>
            </div>
          </div>
          <div className="med-stat-trend-row">
            <span className="med-stat-trend-tag down">
              <TrendingDown size={13} /> 6.7%
            </span>
            <span className="med-stat-vs">vs last month</span>
          </div>
          <Sparkline color="#dc2626" points={[22, 19, 18, 16, 15, 14, 12]} />
        </div>
      </div>

      {/* ── 4. Main Two-Column Layout ── */}
      <div className="med-main-grid">
        {/* ── LEFT COLUMN (70%) ── */}
        <div className="med-left-col">
          {/* Charts Row */}
          <div className="med-charts-row">
            {/* Sales Performance Area Chart */}
            <div className="med-card">
              <div className="med-card-header">
                <div className="med-card-title-wrap">
                  <div className="med-card-header-icon green">
                    <Activity size={16} />
                  </div>
                  <h3>Sales Performance</h3>
                </div>
                <div className="med-dropdown-pill">
                  <span>{salesRange}</span>
                  <ChevronDown size={13} />
                </div>
              </div>

              <div className="med-chart-legend">
                <div className="med-legend-item">
                  <span className="med-legend-dot"></span>
                  <span>Sales</span>
                </div>
                <div className="med-legend-item">
                  <span className="med-legend-dash"></span>
                  <span>Target</span>
                </div>
              </div>

              <div className="med-svg-chart-wrap">
                <svg className="med-svg-chart" viewBox="0 0 400 180" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#007c71" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#007c71" stopOpacity="0.01" />
                    </linearGradient>
                  </defs>

                  {/* Grid Lines */}
                  <line x1="30" y1="30" x2="380" y2="30" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="30" y1="70" x2="380" y2="70" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="30" y1="110" x2="380" y2="110" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="30" y1="150" x2="380" y2="150" stroke="#f1f5f9" strokeWidth="1" />

                  {/* Y Axis labels */}
                  <text x="5" y="34" fontSize="10" fill="#94a3b8">40k</text>
                  <text x="5" y="74" fontSize="10" fill="#94a3b8">30k</text>
                  <text x="5" y="114" fontSize="10" fill="#94a3b8">20k</text>
                  <text x="5" y="154" fontSize="10" fill="#94a3b8">0</text>

                  {/* Target Dashed Line */}
                  <line x1="30" y1="85" x2="380" y2="85" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 4" />

                  {/* Area Fill */}
                  <polygon fill="url(#salesGrad)" points={polygonStr} />

                  {/* Sales Bezier Line */}
                  <polyline
                    fill="none"
                    stroke="#007c71"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={polylineStr}
                  />

                  {/* Data Points */}
                  {chartPoints.map((p, i) => (
                    <g key={i}>
                      <circle cx={p.x} cy={p.y} r="4" fill="#007c71" stroke="#ffffff" strokeWidth="2" />
                      <text x={p.x} y="172" fontSize="9.5" fill="#64748b" textAnchor="middle">{p.label}</text>
                    </g>
                  ))}
                </svg>
              </div>
            </div>

            {/* Regional Performance Bar Chart */}
            <div className="med-card">
              <div className="med-card-header">
                <div className="med-card-title-wrap">
                  <div className="med-card-header-icon teal">
                    <MapPin size={16} />
                  </div>
                  <h3>Regional Performance</h3>
                </div>
                <div className="med-dropdown-pill">
                  <span>{regionRange}</span>
                  <ChevronDown size={13} />
                </div>
              </div>

              <div className="med-bars-wrap">
                <div className="med-bar-col">
                  <span className="med-bar-val">32.4k</span>
                  <div className="med-bar-pill chennai" style={{ height: "81%" }}></div>
                </div>
                <div className="med-bar-col">
                  <span className="med-bar-val">28.7k</span>
                  <div className="med-bar-pill bengaluru" style={{ height: "71.7%" }}></div>
                </div>
                <div className="med-bar-col">
                  <span className="med-bar-val">24.1k</span>
                  <div className="med-bar-pill hyderabad" style={{ height: "60.25%" }}></div>
                </div>
                <div className="med-bar-col">
                  <span className="med-bar-val">18.3k</span>
                  <div className="med-bar-pill coimbatore" style={{ height: "45.75%" }}></div>
                </div>
              </div>

              <div className="med-bar-labels">
                <span className="med-bar-label-item">Chennai</span>
                <span className="med-bar-label-item">Bengaluru</span>
                <span className="med-bar-label-item">Hyderabad</span>
                <span className="med-bar-label-item">Coimbatore</span>
              </div>
            </div>
          </div>

          {/* Recent Doctors Table */}
          <div className="med-card med-table-panel">
            <div className="med-card-header">
              <div className="med-card-title-wrap">
                <div className="med-card-header-icon blue">
                  <Users size={16} />
                </div>
                <h3>Recent Doctors</h3>
              </div>
              <button
                type="button"
                className="med-card-link"
                onClick={onGoToDoctors}
                style={{ background: "none", border: "none" }}
              >
                View All
              </button>
            </div>

            <div className="med-table-wrap">
              <table className="med-table">
                <thead>
                  <tr>
                    <th>Doctor</th>
                    <th>Specialization</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Last Visit</th>
                    <th style={{ textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDoctors.map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <div className="med-doc-name-cell">
                          <DoctorAvatar name={doc.name} size={34} />
                          <span className="med-doc-name-text">{doc.name}</span>
                        </div>
                      </td>
                      <td>{doc.specialization}</td>
                      <td>{doc.location}</td>
                      <td>
                        <span className={`med-status-pill ${doc.status.toLowerCase()}`}>
                          {doc.status}
                        </span>
                      </td>
                      <td>{doc.lastVisit}</td>
                      <td style={{ textAlign: "center" }}>
                        <div className="med-actions-cell" style={{ justifyContent: "center" }}>
                          <button
                            type="button"
                            className="med-action-icon-btn"
                            title="View Doctor Details"
                            onClick={() => doc.rawDoc ? onViewDoctor(doc.rawDoc) : onGoToDoctors()}
                          >
                            <StylizedEyeIcon width={18} height={12} live={true} />
                          </button>
                          <button
                            type="button"
                            className="med-action-icon-btn"
                            title="More Options"
                            onClick={onGoToDoctors}
                          >
                            <MoreVertical size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Monthly Attendance & Field Activity */}
          <div className="med-card">
            <div className="med-card-header">
              <div className="med-card-title-wrap">
                <div className="med-card-header-icon green">
                  <Calendar size={16} />
                </div>
                <h3>Monthly Attendance & Field Activity</h3>
              </div>
              <div className="med-dropdown-pill">
                <span>{attendRange}</span>
                <ChevronDown size={13} />
              </div>
            </div>

            <div className="med-attend-grid">
              {/* Radial Donut Progress */}
              <div className="med-attend-donut-wrap">
                <div className="med-donut-circle">
                  <svg className="med-donut-svg" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#f1f5f9"
                      strokeWidth="3.2"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#007c71"
                      strokeWidth="3.2"
                      strokeDasharray="71, 100"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="med-donut-center-text">71%</div>
                </div>
                <div className="med-metric-content">
                  <span className="med-metric-title">Attendance Rate</span>
                  <span className="med-metric-val">22 / 31 Days</span>
                  <span className="med-metric-trend">↑ 5.2%</span>
                </div>
              </div>

              {/* Working Hours */}
              <div className="med-attend-metric-item">
                <div className="med-metric-icon-wrap cyan">
                  <Clock size={20} />
                </div>
                <div className="med-metric-content">
                  <span className="med-metric-title">Working Hours</span>
                  <span className="med-metric-val">128h 45m</span>
                  <span className="med-metric-trend">↑ 8.4%</span>
                </div>
              </div>

              {/* Field Visits */}
              <div className="med-attend-metric-item">
                <div className="med-metric-icon-wrap green">
                  <MapPin size={20} />
                </div>
                <div className="med-metric-content">
                  <span className="med-metric-title">Field Visits</span>
                  <span className="med-metric-val">18</span>
                  <span className="med-metric-trend">↑ 12.3%</span>
                </div>
              </div>

              {/* Punctuality */}
              <div className="med-attend-metric-item">
                <div className="med-metric-icon-wrap teal">
                  <ShieldCheck size={20} />
                </div>
                <div className="med-metric-content">
                  <span className="med-metric-title">Punctuality</span>
                  <span className="med-metric-val">71%</span>
                  <span className="med-metric-trend">↑ 6.1%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN (30%) ── */}
        <div className="med-right-col">
          {/* Today's Field Activity (Timeline) */}
          <div className="med-card">
            <div className="med-card-header">
              <div className="med-card-title-wrap">
                <div className="med-card-header-icon green">
                  <Compass size={16} />
                </div>
                <h3>Today's Field Activity</h3>
              </div>
              <button
                type="button"
                className="med-card-link"
                onClick={onGoToAttendance}
                style={{ background: "none", border: "none" }}
              >
                View All
              </button>
            </div>

            <div className="med-timeline-list">
              <div className="med-timeline-item">
                <div className="med-timeline-icon green">
                  <Check size={13} strokeWidth={2.5} />
                </div>
                <div className="med-timeline-content">
                  <span className="med-timeline-time">12:05 PM</span>
                  <span className="med-timeline-action">Field visit started</span>
                  <span className="med-timeline-meta">Dr. Rajesh Kumar • Chennai</span>
                </div>
              </div>

              <div className="med-timeline-item">
                <div className="med-timeline-icon teal">
                  <Timer size={13} strokeWidth={2.5} />
                </div>
                <div className="med-timeline-content">
                  <span className="med-timeline-time">11:10 AM</span>
                  <span className="med-timeline-action">Punch In recorded</span>
                  <span className="med-timeline-meta">Karnataka • 1h 23m</span>
                </div>
              </div>

              <div className="med-timeline-item">
                <div className="med-timeline-icon orange">
                  <MapPin size={13} strokeWidth={2.5} />
                </div>
                <div className="med-timeline-content">
                  <span className="med-timeline-time">10:55 AM</span>
                  <span className="med-timeline-action">Location verified</span>
                  <span className="med-timeline-meta">GPS • 12.9716, 77.5946</span>
                </div>
              </div>

              <div className="med-timeline-item">
                <div className="med-timeline-icon blue">
                  <LogIn size={13} strokeWidth={2.5} />
                </div>
                <div className="med-timeline-content">
                  <span className="med-timeline-time">09:45 AM</span>
                  <span className="med-timeline-action">Login successful</span>
                  <span className="med-timeline-meta">Web Portal</span>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Activities */}
          <div className="med-card">
            <div className="med-card-header">
              <div className="med-card-title-wrap">
                <div className="med-card-header-icon blue">
                  <Clock size={16} />
                </div>
                <h3>Upcoming Activities</h3>
              </div>
              <button
                type="button"
                className="med-card-link"
                onClick={onGoToPlan}
                style={{ background: "none", border: "none" }}
              >
                View All
              </button>
            </div>

            <div className="med-activities-list">
              <div className="med-activity-row">
                <div className="med-activity-icon green">
                  <Calendar size={18} />
                </div>
                <div className="med-activity-info">
                  <span className="med-activity-title">Doctor Meeting</span>
                  <span className="med-activity-desc">Dr. Priya Sharma • Today, 2:30 PM</span>
                </div>
              </div>

              <div className="med-activity-row">
                <div className="med-activity-icon cyan">
                  <Activity size={18} />
                </div>
                <div className="med-activity-info">
                  <span className="med-activity-title">Product Demo</span>
                  <span className="med-activity-desc">Apollo Health Center • Tomorrow, 11:00 AM</span>
                </div>
              </div>

              <div className="med-activity-row">
                <div className="med-activity-icon teal">
                  <Clock size={18} />
                </div>
                <div className="med-activity-info">
                  <span className="med-activity-title">Follow Up</span>
                  <span className="med-activity-desc">Dr. Suresh • Tomorrow, 3:00 PM</span>
                </div>
              </div>
            </div>
          </div>

          {/* Promo Card: Better Pet Health Brighter Tomorrow with Puppy */}
          <div className="med-promo-card">
            <div className="med-promo-text">
              <h4 className="med-promo-title">Better Pet Health Brighter Tomorrow</h4>
              <p className="med-promo-desc">
                Together for healthier pets and happier families.
              </p>
              <a
                href="#explore"
                className="med-promo-link"
                onClick={(e) => {
                  e.preventDefault();
                  onGoToDoctors();
                }}
              >
                <span>Explore More</span>
                <ArrowRight size={13} />
              </a>
            </div>
            <div className="med-promo-img-wrap">
              <img
                src={promoDogImg}
                alt="Golden Retriever Puppy"
                className="med-promo-img"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
