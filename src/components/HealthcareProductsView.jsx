import React, { useState, useMemo } from "react";
import {
  Pill,
  Plus,
  Search,
  Tag,
  Package,
  CheckCircle2,
  AlertTriangle,
  Edit2,
  Trash2,
  Eye,
  Filter,
} from "lucide-react";
import "./HealthcareProductsView.css";

const BENCHMARK_PRODUCTS = [
  {
    id: 801,
    name: "Amoxicillin & Potassium Clavulanate (250mg)",
    category: "Medicine / Antibiotic",
    sku: "MED-AMX-250",
    price: 450,
    stock: 124,
    status: "IN STOCK",
    imageEmoji: "💊",
    description: "Broad-spectrum antibacterial therapy for feline and canine dental, skin, and urinary tract infections.",
  },
  {
    id: 802,
    name: "Meloxicam Oral Suspension (1.5mg/ml)",
    category: "Medicine / NSAID",
    sku: "MED-MLX-015",
    price: 320,
    stock: 86,
    status: "IN STOCK",
    imageEmoji: "🧪",
    description: "Non-steroidal anti-inflammatory oral drops for musculoskeletal disorders and post-operative pain relief.",
  },
  {
    id: 803,
    name: "Bravecto Chewable Tick & Flea (20-40kg)",
    category: "Parasiticide",
    sku: "MED-BRV-040",
    price: 1850,
    stock: 42,
    status: "IN STOCK",
    imageEmoji: "🛡️",
    description: "Systemic insecticide and acaricide chewable tablet providing 12-week sustained pest prophylaxis.",
  },
  {
    id: 804,
    name: "Nobivac DHPPi + Lepto Vaccine Pack",
    category: "Biological / Vaccine",
    sku: "VAC-NBV-001",
    price: 650,
    stock: 12,
    status: "LOW STOCK",
    imageEmoji: "💉",
    description: "Live attenuated vaccine against CDV, CAV2, CPV, and inactivated Leptospira canicola and icterohaemorrhagiae.",
  },
  {
    id: 805,
    name: "Chlorhexidine Medicated Shampoo (200ml)",
    category: "Dermatology",
    sku: "DERM-CHX-200",
    price: 380,
    stock: 94,
    status: "IN STOCK",
    imageEmoji: "🧴",
    description: "Antiseptic cleansing foam formulated for pyoderma and superficial microbial skin conditions.",
  },
  {
    id: 806,
    name: "Veterinary Canine Eye Drops (Ciprofloxacin)",
    category: "Ophthalmology",
    sku: "OPH-CIP-005",
    price: 195,
    stock: 0,
    status: "OUT OF STOCK",
    imageEmoji: "💧",
    description: "Bactericidal fluoroquinolone ophthalmic solution for bacterial corneal ulcers and conjunctivitis.",
  },
];

export default function HealthcareProductsView({
  records = [],
  onAddNew = () => {},
  onEdit = () => {},
  onDelete = () => {},
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activeProduct, setActiveProduct] = useState(null);

  const combinedProducts = useMemo(() => {
    if (records && records.length > 0) {
      return records.map((rec, idx) => {
        const fallback = BENCHMARK_PRODUCTS[idx % BENCHMARK_PRODUCTS.length];
        const stockQty = rec.stock ?? rec.quantity ?? fallback.stock;
        const statusStr =
          stockQty <= 0
            ? "OUT OF STOCK"
            : stockQty < 15
            ? "LOW STOCK"
            : "IN STOCK";

        return {
          id: rec.id || fallback.id,
          name: rec.name || rec.product_name || fallback.name,
          category: rec.category || rec.category_name || fallback.category,
          sku: rec.sku || rec.code || fallback.sku,
          price: rec.price || fallback.price,
          stock: stockQty,
          status: statusStr,
          imageEmoji: fallback.imageEmoji,
          description: rec.description || fallback.description,
          _raw: rec,
        };
      });
    }
    return BENCHMARK_PRODUCTS;
  }, [records]);

  const categories = useMemo(() => {
    const set = new Set(combinedProducts.map((p) => p.category));
    return ["All", ...Array.from(set)];
  }, [combinedProducts]);

  const filteredProducts = useMemo(() => {
    return combinedProducts.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = selectedCategory === "All" || p.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [combinedProducts, searchTerm, selectedCategory]);

  return (
    <div className="hc-prod-view">
      {/* ── Page Header ── */}
      <div className="hc-page-header">
        <div>
          <h2 className="hc-view-title">Medicines & Products</h2>
          <p className="hc-view-subtitle">
            Veterinary pharmaceuticals, antibiotics, surgical supplies, supplements and retail products.
          </p>
        </div>
        <button type="button" className="hc-btn-primary" onClick={onAddNew}>
          <Plus size={16} strokeWidth={2.5} />
          <span>Add Product</span>
        </button>
      </div>

      {/* ── Toolbar ── */}
      <div className="hc-prod-toolbar">
        <div className="hc-search-field">
          <Search size={15} className="hc-field-icon" />
          <input
            type="text"
            placeholder="Search medicines by name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="hc-filter-select"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="All">All Categories</option>
          {categories.filter((c) => c !== "All").map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* ── Ecommerce-Healthcare Cards (Section 13 Requirement) ── */}
      <div className="hc-prod-grid">
        {filteredProducts.map((prod) => {
          const inStock = prod.status === "IN STOCK";
          const lowStock = prod.status === "LOW STOCK";

          return (
            <div className="hc-prod-card" key={prod.id}>
              {/* Product Top */}
              <div className="hc-pcard-top">
                <div className="hc-prod-img-box">
                  <span className="hc-prod-emoji">{prod.imageEmoji}</span>
                </div>
                <span
                  className={`hc-badge ${
                    inStock
                      ? "hc-badge-success"
                      : lowStock
                      ? "hc-badge-warning"
                      : "hc-badge-danger"
                  }`}
                >
                  ● {prod.status}
                </span>
              </div>

              {/* Medicine Name & Category */}
              <h4 className="hc-prod-name">{prod.name}</h4>
              <span className="hc-prod-cat">{prod.category}</span>
              <span className="hc-prod-sku">SKU: {prod.sku}</span>

              {/* Price & Stock Strip */}
              <div className="hc-prod-pricing-row">
                <div className="hc-prod-price">
                  <span className="hc-price-currency">₹</span>
                  <strong>{Number(prod.price).toLocaleString("en-IN")}</strong>
                </div>
                <div className="hc-prod-stock-badge">
                  <span>Stock:</span>
                  <strong>{prod.stock}</strong>
                </div>
              </div>

              {/* Actions: Edit & View */}
              <div className="hc-prod-actions">
                <button
                  type="button"
                  className="hc-btn-prod-secondary"
                  onClick={() => setActiveProduct(prod)}
                >
                  <Eye size={13} />
                  <span>View</span>
                </button>
                <button
                  type="button"
                  className="hc-btn-prod-primary"
                  onClick={() => {
                    if (prod._raw) {
                      onEdit(prod._raw);
                    } else {
                      alert(`Editing product details for ${prod.name}`);
                    }
                  }}
                >
                  <Edit2 size={13} />
                  <span>Edit</span>
                </button>
              </div>

              {prod._raw && (
                <div className="hc-prod-crud">
                  <button
                    type="button"
                    className="hc-btn-icon-sm danger"
                    onClick={() => onDelete(prod._raw)}
                    title="Delete Product"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Product Detail Modal */}
      {activeProduct && (
        <div className="hc-modal-backdrop" onClick={() => setActiveProduct(null)}>
          <div
            className="hc-prod-detail-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="hc-modal-header">
              <span className="hc-drawer-tag">MEDICINE SPECIFICATIONS</span>
              <button
                type="button"
                className="hc-btn-close"
                onClick={() => setActiveProduct(null)}
              >
                ✕
              </button>
            </div>
            <div className="hc-prod-modal-body">
              <div className="hc-pmodal-title-row">
                <span style={{ fontSize: "2rem" }}>{activeProduct.imageEmoji}</span>
                <div>
                  <h3>{activeProduct.name}</h3>
                  <p>{activeProduct.category} · SKU: {activeProduct.sku}</p>
                </div>
              </div>
              <div className="hc-pmodal-kpis">
                <div className="hc-pkpi">
                  <span>Selling Price</span>
                  <strong>₹{Number(activeProduct.price).toLocaleString("en-IN")}</strong>
                </div>
                <div className="hc-pkpi">
                  <span>Available Inventory</span>
                  <strong>{activeProduct.stock} units</strong>
                </div>
                <div className="hc-pkpi">
                  <span>Fulfillment Status</span>
                  <strong className="text-teal">{activeProduct.status}</strong>
                </div>
              </div>
              <div className="hc-pmodal-desc">
                <h5>Clinical Description & Indications</h5>
                <p>{activeProduct.description}</p>
              </div>
            </div>
            <div className="hc-modal-footer">
              <button
                type="button"
                className="hc-btn-secondary"
                onClick={() => setActiveProduct(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
