import { useState } from "react";
import {
  fetchList,
  createRecord,
  updateRecord,
  TABLE_CONFIG,
  coerceFieldValue,
} from "../api.js";
import {
  Pill,
  Package,
  Stethoscope,
  ArrowRight,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  FileSpreadsheet,
} from "lucide-react";
import "./BulkTools.css";

const IMPORT_EXAMPLES = {
  products: {
    header: "name,price,mrp,pincode,stock_quantity",
    sample: "Calcium Syrup 200ml,320,399,560076,50",
  },
  inventory: {
    header: "product_id,seller_id,pincode,available_quantity,reserved_quantity",
    sample: "12,4,560076,50,5",
  },
  doctors: {
    header: "name,specializations,pincode,experience_years,consultation_fee",
    sample: "Dr. Asha Rao,General Medicine,560076,8,500",
  },
};

function toCSV(rows) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [headers.map(escape).join(",")].concat(
    rows.map((r) => headers.map((h) => escape(r[h])).join(","))
  ).join("\n");
}

function downloadText(filename, text, mime = "text/csv;charset=utf-8;") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] ?? "";
    });
    return obj;
  });
}

function parseImportText(text) {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  }
  return parseCSV(trimmed);
}

export default function BulkTools() {
  const [selectedTool, setSelectedTool] = useState("products"); // "products" | "inventory" | "doctors"
  const [filterPincode, setFilterPincode] = useState("");
  const [stockOp, setStockOp] = useState("add");
  const [stockValue, setStockValue] = useState("10");
  const [priceOp, setPriceOp] = useState("rupee");
  const [priceValue, setPriceValue] = useState("10");
  const [importText, setImportText] = useState("");
  const [busy, setBusy] = useState(false);
  const [activityLog, setActivityLog] = useState([]);

  function addLog(msg) {
    const time = new Date().toLocaleTimeString([], { hour12: false });
    setActivityLog((prev) => [`[${time}] ${msg}`, ...prev.slice(0, 19)]);
  }

  async function handleExport() {
    setBusy(true);
    try {
      addLog(`Fetching ${selectedTool} records for CSV export...`);
      const data = await fetchList(selectedTool);
      if (!Array.isArray(data) || data.length === 0) {
        addLog(`No records available to export for ${selectedTool}.`);
        return;
      }
      const csv = toCSV(data);
      downloadText(`${selectedTool}_export_${new Date().toISOString().slice(0, 10)}.csv`, csv);
      addLog(`Exported ${data.length} records to CSV successfully.`);
    } catch (err) {
      addLog(`Error exporting: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleImport() {
    if (!importText.trim()) {
      alert("Please paste CSV data to import.");
      return;
    }
    setBusy(true);
    try {
      const records = parseImportText(importText);
      if (records.length === 0) {
        addLog("No valid rows could be parsed from input.");
        return;
      }
      addLog(`Starting batch import of ${records.length} records into ${selectedTool}...`);
      const config = TABLE_CONFIG[selectedTool];
      let created = 0;
      for (const row of records) {
        const payload = {};
        config?.fields?.forEach((f) => {
          if (row[f.key] !== undefined && !f.readOnly) {
            payload[f.key] = coerceFieldValue(f, row[f.key]);
          }
        });
        await createRecord(selectedTool, payload);
        created++;
      }
      addLog(`Batch completed: created ${created} records successfully.`);
      setImportText("");
    } catch (err) {
      addLog(`Import failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  const toolCards = [
    {
      key: "products",
      title: "Medicines & Products",
      desc: "Update product prices, stock and details in bulk.",
      icon: Pill,
      colorClass: "blue",
    },
    {
      key: "inventory",
      title: "Inventory",
      desc: "Update inventory quantities and stock levels.",
      icon: Package,
      colorClass: "teal",
    },
    {
      key: "doctors",
      title: "Doctors",
      desc: "Bulk update doctor information.",
      icon: Stethoscope,
      colorClass: "purple",
    },
  ];

  return (
    <div className="hc-bulk-view">
      {/* ── Page Header (Section 19 Requirement) ── */}
      <div className="hc-page-header">
        <div>
          <h2 className="hc-view-title">Bulk Tools</h2>
          <p className="hc-view-subtitle">
            Manage large-scale healthcare and inventory updates.
          </p>
        </div>
      </div>

      {/* ── Three Main Cards (Section 19 Requirement) ── */}
      <div className="hc-bulk-cards-grid">
        {toolCards.map((tool) => {
          const Icon = tool.icon;
          const isSelected = selectedTool === tool.key;
          return (
            <div
              key={tool.key}
              className={`hc-bulk-card ${isSelected ? "selected" : ""}`}
            >
              <div className={`hc-bulk-card-icon ${tool.colorClass}`}>
                <Icon size={28} />
              </div>
              <h3 className="hc-bulk-card-title">{tool.title}</h3>
              <p className="hc-bulk-card-desc">{tool.desc}</p>
              <button
                type="button"
                className={`hc-bulk-card-btn ${isSelected ? "active" : ""}`}
                onClick={() => setSelectedTool(tool.key)}
              >
                <span>{isSelected ? "Active Tool" : "Open Tool"}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Active Tool Operations Workspace ── */}
      <div className="hc-bulk-workspace">
        <div className="hc-workspace-head">
          <div className="hc-ws-title-wrap">
            <FileSpreadsheet size={20} className="text-teal" />
            <div>
              <h4>
                {toolCards.find((t) => t.key === selectedTool)?.title} Operations
              </h4>
              <p>Configure batch modifications, upload CSV or export live data.</p>
            </div>
          </div>
          <button
            type="button"
            className="hc-btn-secondary"
            onClick={handleExport}
            disabled={busy}
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>

        <div className="hc-workspace-grid">
          {/* CSV Import Panel */}
          <div className="hc-bulk-panel">
            <h5 className="hc-panel-title">Batch Import / Append Data</h5>
            <p className="hc-panel-sub">
              Paste comma-separated rows. Example format:
            </p>
            <pre className="hc-csv-sample">
              {IMPORT_EXAMPLES[selectedTool]?.header}
              {"\n"}
              {IMPORT_EXAMPLES[selectedTool]?.sample}
            </pre>
            <textarea
              className="hc-bulk-textarea"
              rows={5}
              placeholder="Paste CSV rows here..."
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <button
              type="button"
              className="hc-btn-primary"
              style={{ marginTop: 10 }}
              onClick={handleImport}
              disabled={busy}
            >
              <Upload size={14} />
              <span>{busy ? "Processing..." : "Run Batch Import"}</span>
            </button>
          </div>

          {/* Activity Log */}
          <div className="hc-bulk-panel">
            <h5 className="hc-panel-title">Operation Audit Log</h5>
            <p className="hc-panel-sub">Real-time batch execution history:</p>
            <div className="hc-activity-log">
              {activityLog.length === 0 ? (
                <span className="hc-log-empty">No bulk operations run yet.</span>
              ) : (
                activityLog.map((log, i) => (
                  <div key={i} className="hc-log-line">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}