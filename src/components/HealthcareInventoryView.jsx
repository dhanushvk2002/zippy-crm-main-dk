import React, { useState, useMemo } from "react";
import {
  Package,
  AlertTriangle,
  XCircle,
  DollarSign,
  Search,
  Filter,
  Download,
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import "./HealthcareInventoryView.css";

const BENCHMARK_INVENTORY = [
  {
    id: 901,
    product: "Amoxicillin & Potassium Clavulanate (250mg)",
    sku: "MED-AMX-250",
    category: "Antibiotic",
    stock: 124,
    price: 450,
    status: "IN STOCK",
    updated: "2026-09-22",
  },
  {
    id: 902,
    product: "Meloxicam Oral Drops (1.5mg/ml)",
    sku: "MED-MLX-015",
    category: "NSAID",
    stock: 86,
    price: 320,
    status: "IN STOCK",
    updated: "2026-09-20",
  },
  {
    id: 903,
    product: "Bravecto Chewable Tick & Flea (20-40kg)",
    sku: "MED-BRV-040",
    category: "Parasiticide",
    stock: 42,
    price: 1850,
    status: "IN STOCK",
    updated: "2026-09-19",
  },
  {
    id: 904,
    product: "Nobivac DHPPi + Lepto Vaccine Pack",
    sku: "VAC-NBV-001",
    category: "Vaccine",
    stock: 12,
    price: 650,
    status: "LOW STOCK",
    updated: "2026-09-24",
  },
  {
    id: 905,
    product: "Chlorhexidine Medicated Shampoo (200ml)",
    sku: "DERM-CHX-200",
    category: "Dermatology",
    stock: 94,
    price: 380,
    status: "IN STOCK",
    updated: "2026-09-18",
  },
  {
    id: 906,
    product: "Veterinary Ciprofloxacin Eye Drops",
    sku: "OPH-CIP-005",
    category: "Ophthalmology",
    stock: 0,
    price: 195,
    status: "OUT OF STOCK",
    updated: "2026-09-15",
  },
  {
    id: 907,
    product: "Canine Joint Health Glucosamine Tabs",
    sku: "SUP-GLU-100",
    category: "Supplements",
    stock: 65,
    price: 890,
    status: "IN STOCK",
    updated: "2026-09-21",
  },
  {
    id: 908,
    product: "Surgical Sterile Gauze Swabs 10x10cm",
    sku: "SUR-GAU-100",
    category: "Surgical",
    stock: 8,
    price: 120,
    status: "LOW STOCK",
    updated: "2026-09-23",
  },
];

export default function HealthcareInventoryView({
  records = [],
  onAddNew = () => {},
  onEdit = () => {},
  onDelete = () => {},
  onBulkUpdate = () => {},
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  const combinedInventory = useMemo(() => {
    if (records && records.length > 0) {
      return records.map((rec, idx) => {
        const fallback = BENCHMARK_INVENTORY[idx % BENCHMARK_INVENTORY.length];
        const stockQty = Number(rec.stock_quantity ?? rec.stock ?? rec.quantity ?? fallback.stock);
        const priceVal = Number(rec.price ?? rec.unit_price ?? fallback.price);
        const statusStr =
          stockQty <= 0
            ? "OUT OF STOCK"
            : stockQty < 15
            ? "LOW STOCK"
            : "IN STOCK";

        return {
          id: rec.id || fallback.id,
          product: rec.product_name || rec.name || fallback.product,
          sku: rec.sku || rec.code || fallback.sku,
          category: rec.category || rec.category_name || fallback.category,
          stock: stockQty,
          price: priceVal,
          status: statusStr,
          updated: rec.updated_at?.slice(0, 10) || rec.date || fallback.updated,
          _raw: rec,
        };
      });
    }
    return BENCHMARK_INVENTORY;
  }, [records]);

  // Top KPIs computation
  const totalProducts = combinedInventory.length;
  const lowStockCount = combinedInventory.filter((i) => i.status === "LOW STOCK").length;
  const outOfStockCount = combinedInventory.filter((i) => i.status === "OUT OF STOCK").length;
  const inventoryValue = combinedInventory.reduce((acc, curr) => acc + curr.stock * curr.price, 0);

  const filteredInventory = useMemo(() => {
    return combinedInventory.filter((item) => {
      const matchSearch =
        item.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === "All" || item.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [combinedInventory, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredInventory.length / pageSize));
  const pagedItems = filteredInventory.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function exportCSV() {
    const headers = ["Product", "SKU", "Category", "Stock", "Price", "Status", "Updated"];
    const rows = filteredInventory.map((i) => [
      `"${i.product}"`,
      `"${i.sku}"`,
      `"${i.category}"`,
      i.stock,
      i.price,
      i.status,
      i.updated,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inventory_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="hc-inv-view">
      {/* ── Page Header ── */}
      <div className="hc-page-header">
        <div>
          <h2 className="hc-view-title">Inventory Management</h2>
          <p className="hc-view-subtitle">
            Stock audit, reorder thresholds, inventory valuation and veterinary batch monitoring.
          </p>
        </div>
        <div className="hc-header-action-group">
          <button type="button" className="hc-btn-secondary" onClick={exportCSV}>
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            className="hc-btn-secondary"
            onClick={() => {
              if (onBulkUpdate) onBulkUpdate();
              else alert("Opening Bulk Inventory Update Tool...");
            }}
          >
            <RefreshCw size={14} />
            <span>Bulk Update</span>
          </button>
          <button type="button" className="hc-btn-primary" onClick={onAddNew}>
            <Plus size={16} strokeWidth={2.5} />
            <span>Add Stock Item</span>
          </button>
        </div>
      </div>

      {/* ── Top KPIs (Section 14 Requirement) ── */}
      <div className="hc-inv-kpis">
        <div className="hc-ikpi-card">
          <div className="hc-ikpi-icon blue">
            <Package size={20} />
          </div>
          <div>
            <span className="hc-ikpi-lbl">Total Products</span>
            <strong className="hc-ikpi-val">{totalProducts}</strong>
            <span className="hc-ikpi-sub">Across all categories</span>
          </div>
        </div>

        <div className="hc-ikpi-card">
          <div className="hc-ikpi-icon amber">
            <AlertTriangle size={20} />
          </div>
          <div>
            <span className="hc-ikpi-lbl">Low Stock Items</span>
            <strong className="hc-ikpi-val text-amber">{lowStockCount}</strong>
            <span className="hc-ikpi-sub">Below 15 units buffer</span>
          </div>
        </div>

        <div className="hc-ikpi-card">
          <div className="hc-ikpi-icon red">
            <XCircle size={20} />
          </div>
          <div>
            <span className="hc-ikpi-lbl">Out of Stock</span>
            <strong className="hc-ikpi-val text-red">{outOfStockCount}</strong>
            <span className="hc-ikpi-sub">Needs immediate PO</span>
          </div>
        </div>

        <div className="hc-ikpi-card">
          <div className="hc-ikpi-icon teal">
            <DollarSign size={20} />
          </div>
          <div>
            <span className="hc-ikpi-lbl">Inventory Value</span>
            <strong className="hc-ikpi-val text-teal">₹{inventoryValue.toLocaleString("en-IN")}</strong>
            <span className="hc-ikpi-sub">Estimated retail asset</span>
          </div>
        </div>
      </div>

      {/* ── Toolbar: Search & Filters ── */}
      <div className="hc-inv-toolbar">
        <div className="hc-search-field">
          <Search size={15} className="hc-field-icon" />
          <input
            type="text"
            placeholder="Search inventory by product, SKU, or category..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="hc-inv-filters">
          <select
            className="hc-filter-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="All">All Stock Statuses</option>
            <option value="IN STOCK">In Stock</option>
            <option value="LOW STOCK">Low Stock</option>
            <option value="OUT OF STOCK">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* ── Inventory Table (Section 14 Requirement) ── */}
      <div className="hc-table-container">
        <table className="hc-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Stock</th>
              <th>Price</th>
              <th>Status</th>
              <th>Updated</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedItems.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong className="hc-inv-pname">{item.product}</strong>
                </td>
                <td>
                  <span className="hc-inv-sku">{item.sku}</span>
                </td>
                <td>
                  <span className="hc-spec-pill">{item.category}</span>
                </td>
                <td>
                  <strong>{item.stock}</strong> units
                </td>
                <td>
                  <strong>₹{Number(item.price).toLocaleString("en-IN")}</strong>
                </td>
                <td>
                  <span
                    className={`hc-badge ${
                      item.status === "IN STOCK"
                        ? "hc-badge-success"
                        : item.status === "LOW STOCK"
                        ? "hc-badge-warning"
                        : "hc-badge-danger"
                    }`}
                  >
                    ● {item.status}
                  </span>
                </td>
                <td>
                  <span className="hc-inv-date">{item.updated}</span>
                </td>
                <td>
                  <div className="hc-row-actions">
                    <button
                      type="button"
                      className="hc-btn-table-icon"
                      onClick={() => {
                        if (item._raw) onEdit(item._raw);
                        else alert(`Editing ${item.product}`);
                      }}
                      title="Edit Stock"
                    >
                      <Edit2 size={13} />
                    </button>
                    {item._raw && (
                      <button
                        type="button"
                        className="hc-btn-table-icon danger"
                        onClick={() => onDelete(item._raw)}
                        title="Delete Item"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="hc-table-pagination">
          <span>
            Showing {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, filteredInventory.length)} of {filteredInventory.length} items
          </span>
          <div className="hc-pag-btns">
            <button
              type="button"
              className="hc-btn-pag"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              <ChevronLeft size={14} />
            </button>
            <span className="hc-pag-curr">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              className="hc-btn-pag"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
