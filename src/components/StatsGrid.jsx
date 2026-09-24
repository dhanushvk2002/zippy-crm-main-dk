import { useEffect, useState } from "react";
import { fetchStatCounts } from "../api.js";
import { STATS } from "../data.js";
import {
  Users,
  Stethoscope,
  Building2,
  Calendar,
  Package,
  Layers,
  ShoppingBag,
  Store,
  Sparkles,
  CreditCard,
  Headphones,
  HeartHandshake,
} from "lucide-react";
import "./StatsGrid.css";

const STAT_CONFIG = {
  profiles: {
    label: "Pet Parents",
    icon: Users,
    color: "#2563eb",
    bg: "rgba(37, 99, 235, 0.08)",
    border: "rgba(37, 99, 235, 0.18)",
    trend: "+8.4%",
    spark: [12, 16, 14, 19, 23, 21, 28],
  },
  pets: {
    label: "Total Pets",
    icon: HeartHandshake,
    color: "#10b981",
    bg: "rgba(16, 185, 129, 0.08)",
    border: "rgba(16, 185, 129, 0.18)",
    trend: "+6.2%",
    spark: [10, 14, 18, 16, 22, 24, 29],
  },
  doctors: {
    label: "Doctors",
    icon: Stethoscope,
    color: "#007c71",
    bg: "rgba(0, 124, 113, 0.08)",
    border: "rgba(0, 124, 113, 0.18)",
    trend: "+12.1%",
    spark: [8, 11, 14, 12, 17, 19, 24],
  },
  clinics: {
    label: "Clinics",
    icon: Building2,
    color: "#0284c7",
    bg: "rgba(2, 132, 199, 0.08)",
    border: "rgba(2, 132, 199, 0.18)",
    trend: "+4.5%",
    spark: [6, 9, 8, 11, 13, 12, 16],
  },
  appointments: {
    label: "Appointments",
    icon: Calendar,
    color: "#8b5cf6",
    bg: "rgba(139, 92, 246, 0.08)",
    border: "rgba(139, 92, 246, 0.18)",
    trend: "+15.3%",
    spark: [14, 18, 16, 23, 22, 27, 33],
  },
  products: {
    label: "Products",
    icon: Package,
    color: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.08)",
    border: "rgba(245, 158, 11, 0.18)",
    trend: "+5.1%",
    spark: [15, 17, 16, 20, 22, 25, 29],
  },
  inventory: {
    label: "Inventory",
    icon: Layers,
    color: "#6366f1",
    bg: "rgba(99, 102, 241, 0.08)",
    border: "rgba(99, 102, 241, 0.18)",
    trend: "+9.8%",
    spark: [20, 24, 21, 26, 25, 30, 34],
  },
  orders: {
    label: "Orders",
    icon: ShoppingBag,
    color: "#f43f5e",
    bg: "rgba(244, 63, 94, 0.08)",
    border: "rgba(244, 63, 94, 0.18)",
    trend: "+11.2%",
    spark: [11, 15, 14, 19, 21, 25, 31],
  },
  sellers: {
    label: "Sellers",
    icon: Store,
    color: "#059669",
    bg: "rgba(5, 150, 105, 0.08)",
    border: "rgba(5, 150, 105, 0.18)",
    trend: "+3.2%",
    spark: [5, 7, 6, 9, 11, 10, 14],
  },
  services: {
    label: "Services",
    icon: Sparkles,
    color: "#0ea5e9",
    bg: "rgba(14, 165, 233, 0.08)",
    border: "rgba(14, 165, 233, 0.18)",
    trend: "+7.4%",
    spark: [9, 11, 13, 12, 16, 18, 22],
  },
  payments: {
    label: "Payments",
    icon: CreditCard,
    color: "#7c3aed",
    bg: "rgba(124, 58, 237, 0.08)",
    border: "rgba(124, 58, 237, 0.18)",
    trend: "+14.8%",
    spark: [16, 19, 17, 24, 26, 29, 36],
  },
  support_tickets: {
    label: "Support",
    icon: Headphones,
    color: "#ea580c",
    bg: "rgba(234, 88, 12, 0.08)",
    border: "rgba(234, 88, 12, 0.18)",
    trend: "-6.7%",
    spark: [18, 16, 15, 14, 12, 11, 8],
  },
};

function MiniSparkline({ color, points = [10, 15, 12, 18, 16, 22] }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const w = 46;
  const h = 16;
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((p - min) / range) * (h - 2) - 1;
    return `${x},${y}`;
  });

  return (
    <svg className="admin-spark-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coords.join(" ")}
      />
    </svg>
  );
}

export default function StatsGrid({ refreshTrigger, stats = STATS }) {
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setTimeout(() => { if (!cancelled) setLoading(true); }, 0);
    fetchStatCounts(stats).then((result) => {
      if (!cancelled) {
        setCounts(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [refreshTrigger, stats]);

  return (
    <div className="admin-stats-container">
      <div className="admin-stats-grid">
        {stats.map((stat) => {
          const cfg = STAT_CONFIG[stat.key] || {
            label: stat.label,
            icon: Package,
            color: "#007c71",
            bg: "rgba(0, 124, 113, 0.08)",
            border: "rgba(0, 124, 113, 0.18)",
            trend: "+5.0%",
            spark: [10, 12, 14, 16, 18, 20],
          };
          const IconComponent = cfg.icon;
          const rawValue = counts[stat.key];
          const displayValue = loading
            ? "…"
            : rawValue === null || rawValue === undefined
            ? "0"
            : Number(rawValue).toLocaleString("en-IN");

          return (
            <div
              className="admin-stat-card"
              key={stat.key}
              style={{
                "--stat-color": cfg.color,
                "--stat-bg": cfg.bg,
                "--stat-border": cfg.border,
              }}
            >
              <div className="admin-stat-top">
                <div className="admin-stat-icon-box">
                  <IconComponent size={14} />
                </div>
                <div className="admin-stat-spark">
                  <MiniSparkline color={cfg.color} points={cfg.spark} />
                </div>
              </div>

              <div className="admin-stat-body">
                <span className="admin-stat-val">{displayValue}</span>
                <span className="admin-stat-lbl">{cfg.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
