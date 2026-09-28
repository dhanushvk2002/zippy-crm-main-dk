import React, { useState, useMemo } from "react";
import {
  Users,
  MapPin,
  TrendingUp,
  FileText,
  Calendar,
  DollarSign,
  Plus,
  Search,
  Filter,
  Award,
  ChevronRight,
  Edit2,
  Trash2,
} from "lucide-react";
import DoctorAvatar from "./DoctorAvatar.jsx";
import "./HealthcareSalesExecutivesView.css";

const BENCHMARK_EXECUTIVES = [
  {
    id: 1101,
    name: "Rajesh Kannan",
    region: "Bangalore South (BTM, Jayanagar)",
    doctorsVisited: 84,
    reportsCount: 42,
    salesGenerated: "₹ 4,20,000",
    performancePercent: 94,
    target: "₹ 4,50,000",
    phone: "+91 98450 11223",
    status: "Active",
  },
  {
    id: 1102,
    name: "Suresh Babu",
    region: "Bangalore East (Indiranagar, Whitefield)",
    doctorsVisited: 76,
    reportsCount: 38,
    salesGenerated: "₹ 3,85,000",
    performancePercent: 88,
    target: "₹ 4,40,000",
    phone: "+91 99002 33441",
    status: "Active",
  },
  {
    id: 1103,
    name: "Manoj Kumar",
    region: "Bangalore Central (Koramangala, MG Road)",
    doctorsVisited: 92,
    reportsCount: 51,
    salesGenerated: "₹ 5,10,000",
    performancePercent: 102,
    target: "₹ 5,00,000",
    phone: "+91 97411 55662",
    status: "Active",
  },
  {
    id: 1104,
    name: "Anand Verma",
    region: "Bangalore North (Hebbal, Yelahanka)",
    doctorsVisited: 68,
    reportsCount: 31,
    salesGenerated: "₹ 2,90,000",
    performancePercent: 78,
    target: "₹ 3,70,000",
    phone: "+91 98862 77883",
    status: "Active",
  },
];

export default function HealthcareSalesExecutivesView({
  records = [],
  onAddNew = () => {},
  onEdit = () => {},
  onDelete = () => {},
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const combinedExecs = useMemo(() => {
    if (records && records.length > 0) {
      return records.map((rec, idx) => {
        const fallback = BENCHMARK_EXECUTIVES[idx % BENCHMARK_EXECUTIVES.length];
        return {
          id: rec.id || fallback.id,
          name: rec.name || rec.executive_name || fallback.name,
          region: rec.region || rec.territory || fallback.region,
          doctorsVisited: rec.doctors_visited || fallback.doctorsVisited,
          reportsCount: rec.reports_submitted || fallback.reportsCount,
          salesGenerated: rec.sales_total ? `₹ ${rec.sales_total}` : fallback.salesGenerated,
          performancePercent: rec.performance || fallback.performancePercent,
          target: fallback.target,
          phone: rec.phone || fallback.phone,
          status: rec.status || "Active",
          _raw: rec,
        };
      });
    }
    return BENCHMARK_EXECUTIVES;
  }, [records]);

  const filteredExecs = useMemo(() => {
    return combinedExecs.filter((e) => {
      return (
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.region.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [combinedExecs, searchTerm]);

  return (
    <div className="hc-execs-view">
      {/* ── Page Header ── */}
      <div className="hc-page-header">
        <div>
          <h2 className="hc-view-title">Sales Executives</h2>
          <p className="hc-view-subtitle">
            Field territory sales managers, clinical outreach reports and veterinary clinic coverage.
          </p>
        </div>
        <button type="button" className="hc-btn-primary" onClick={onAddNew}>
          <Plus size={16} strokeWidth={2.5} />
          <span>Add Executive</span>
        </button>
      </div>

      {/* ── Toolbar ── */}
      <div className="hc-execs-toolbar">
        <div className="hc-search-field">
          <Search size={15} className="hc-field-icon" />
          <input
            type="text"
            placeholder="Search executives by name or territory..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* ── Executive Cards (Section 16 Requirement) ── */}
      <div className="hc-execs-grid">
        {filteredExecs.map((exec) => (
          <div className="hc-exec-card" key={exec.id}>
            {/* Header: Avatar, Name & Region */}
            <div className="hc-exec-card-head">
              <DoctorAvatar name={exec.name} size={50} showOnline={true} isOnline={true} />
              <div className="hc-exec-head-info">
                <h4 className="hc-exec-name">{exec.name}</h4>
                <div className="hc-exec-region">
                  <MapPin size={13} className="hc-icon-pin" />
                  <span>{exec.region}</span>
                </div>
              </div>
              <span className="hc-badge hc-badge-success">● {exec.status}</span>
            </div>

            {/* Metrics Grid: Doctors Visited, Reports, Sales */}
            <div className="hc-exec-metrics-grid">
              <div className="hc-emetric-box">
                <span className="hc-emetric-lbl">Doctors Visited</span>
                <strong className="hc-emetric-val">{exec.doctorsVisited}</strong>
              </div>
              <div className="hc-emetric-box">
                <span className="hc-emetric-lbl">Reports</span>
                <strong className="hc-emetric-val">{exec.reportsCount}</strong>
              </div>
              <div className="hc-emetric-box highlight">
                <span className="hc-emetric-lbl">Sales</span>
                <strong className="hc-emetric-val text-blue">{exec.salesGenerated}</strong>
              </div>
            </div>

            {/* Minimal Clean Performance Bar (Section 16 Requirement) */}
            <div className="hc-exec-perf-bar-wrap">
              <div className="hc-perf-label-row">
                <span className="hc-perf-title">Monthly Quota Performance</span>
                <strong className="hc-perf-pct">{exec.performancePercent}%</strong>
              </div>
              <div className="hc-perf-track">
                <div
                  className="hc-perf-fill"
                  style={{
                    width: `${Math.min(100, exec.performancePercent)}%`,
                    backgroundColor:
                      exec.performancePercent >= 100
                        ? "#10b981"
                        : exec.performancePercent >= 85
                        ? "#0284c7"
                        : "#f59e0b",
                  }}
                />
              </div>
              <span className="hc-perf-target">Target: {exec.target}</span>
            </div>

            {/* Footer Actions */}
            <div className="hc-exec-footer">
              <button
                type="button"
                className="hc-btn-card-action"
                onClick={() => alert(`View territory route for ${exec.name}`)}
              >
                Territory Coverage
              </button>
              {exec._raw && (
                <div className="hc-exec-crud">
                  <button
                    type="button"
                    className="hc-btn-icon-sm"
                    onClick={() => onEdit(exec._raw)}
                    title="Edit Executive"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    type="button"
                    className="hc-btn-icon-sm danger"
                    onClick={() => onDelete(exec._raw)}
                    title="Delete Executive"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
