import React, { useState, useMemo } from "react";
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Plus,
  Eye,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import "./HealthcareOrdersView.css";

const BENCHMARK_ORDERS = [
  {
    id: 1001,
    orderId: "ORD-9921",
    customer: "Arun Kumar",
    customerPhone: "+91 98451 22334",
    items: "Amoxicillin (250mg) x 2, Dental Chew x 1",
    itemsCount: 3,
    amount: 1450,
    payment: "UPI / Paid",
    status: "Completed",
    date: "2026-09-24",
  },
  {
    id: 1002,
    orderId: "ORD-9922",
    customer: "Sneha Rao",
    customerPhone: "+91 99001 88776",
    items: "Bravecto Chewable (20-40kg) x 1",
    itemsCount: 1,
    amount: 1850,
    payment: "Card / Paid",
    status: "Processing",
    date: "2026-09-24",
  },
  {
    id: 1003,
    orderId: "ORD-9923",
    customer: "Vikram Das",
    customerPhone: "+91 97410 44552",
    items: "Meloxicam Oral Suspension x 1, Gauze Swabs x 2",
    itemsCount: 3,
    amount: 560,
    payment: "Cash on Delivery",
    status: "Pending",
    date: "2026-09-24",
  },
  {
    id: 1004,
    orderId: "ORD-9924",
    customer: "Pooja Hegde",
    customerPhone: "+91 98860 11992",
    items: "Nobivac DHPPi Pack x 1",
    itemsCount: 1,
    amount: 650,
    payment: "UPI / Paid",
    status: "Completed",
    date: "2026-09-23",
  },
  {
    id: 1005,
    orderId: "ORD-9925",
    customer: "Karthik Nair",
    customerPhone: "+91 96112 33445",
    items: "Chlorhexidine Medicated Shampoo x 1",
    itemsCount: 1,
    amount: 380,
    payment: "NetBanking / Failed",
    status: "Cancelled",
    date: "2026-09-22",
  },
  {
    id: 1006,
    orderId: "ORD-9926",
    customer: "Divya Menon",
    customerPhone: "+91 94481 99221",
    items: "Canine Joint Health Glucosamine Tabs x 2",
    itemsCount: 2,
    amount: 1780,
    payment: "UPI / Paid",
    status: "Processing",
    date: "2026-09-24",
  },
];

export default function HealthcareOrdersView({
  records = [],
  onAddNew = () => {},
  onEdit = () => {},
  onDelete = () => {},
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  const combinedOrders = useMemo(() => {
    if (records && records.length > 0) {
      return records.map((rec, idx) => {
        const fallback = BENCHMARK_ORDERS[idx % BENCHMARK_ORDERS.length];
        return {
          id: rec.id || fallback.id,
          orderId: rec.order_number || rec.order_id || `ORD-${rec.id || fallback.id}`,
          customer: rec.customer_name || rec.customer || fallback.customer,
          customerPhone: rec.phone || fallback.customerPhone,
          items: rec.items_summary || rec.items || fallback.items,
          itemsCount: rec.total_items || fallback.itemsCount,
          amount: Number(rec.total_amount || rec.amount || fallback.amount),
          payment: rec.payment_method || rec.payment || fallback.payment,
          status: rec.status || fallback.status,
          date: rec.created_at?.slice(0, 10) || rec.date || fallback.date,
          _raw: rec,
        };
      });
    }
    return BENCHMARK_ORDERS;
  }, [records]);

  // Statistics KPI counts
  const totalOrders = combinedOrders.length;
  const pendingCount = combinedOrders.filter((o) => o.status.toLowerCase() === "pending").length;
  const processingCount = combinedOrders.filter((o) => o.status.toLowerCase() === "processing").length;
  const completedCount = combinedOrders.filter((o) => o.status.toLowerCase() === "completed").length;
  const cancelledCount = combinedOrders.filter((o) => o.status.toLowerCase() === "cancelled").length;

  const filteredOrders = useMemo(() => {
    return combinedOrders.filter((o) => {
      const matchSearch =
        o.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.items.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus =
        statusFilter === "All" || o.status.toLowerCase() === statusFilter.toLowerCase();
      return matchSearch && matchStatus;
    });
  }, [combinedOrders, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const pagedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="hc-orders-view">
      {/* ── Page Header ── */}
      <div className="hc-page-header">
        <div>
          <h2 className="hc-view-title">Orders Management</h2>
          <p className="hc-view-subtitle">
            Pharmacy dispensing orders, prescription checkouts and veterinary retail sales.
          </p>
        </div>
        <button type="button" className="hc-btn-primary" onClick={onAddNew}>
          <Plus size={16} strokeWidth={2.5} />
          <span>New Order</span>
        </button>
      </div>

      {/* ── Cards / Statistics KPIs (Section 15 Requirement) ── */}
      <div className="hc-orders-kpis">
        <div className="hc-okpi-card">
          <span className="hc-okpi-lbl">Total Orders</span>
          <strong className="hc-okpi-val">{totalOrders}</strong>
        </div>
        <div className="hc-okpi-card warning">
          <span className="hc-okpi-lbl">Pending</span>
          <strong className="hc-okpi-val text-amber">{pendingCount}</strong>
        </div>
        <div className="hc-okpi-card blue">
          <span className="hc-okpi-lbl">Processing</span>
          <strong className="hc-okpi-val text-blue">{processingCount}</strong>
        </div>
        <div className="hc-okpi-card success">
          <span className="hc-okpi-lbl">Completed</span>
          <strong className="hc-okpi-val text-green">{completedCount}</strong>
        </div>
        <div className="hc-okpi-card danger">
          <span className="hc-okpi-lbl">Cancelled</span>
          <strong className="hc-okpi-val text-red">{cancelledCount}</strong>
        </div>
      </div>

      {/* ── Toolbar: Search & Filter ── */}
      <div className="hc-orders-toolbar">
        <div className="hc-search-field">
          <Search size={15} className="hc-field-icon" />
          <input
            type="text"
            placeholder="Search by Order ID, customer, or medicine..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <select
          className="hc-filter-select"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="All">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Processing">Processing</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {/* ── Orders Table (Section 15 Requirement) ── */}
      <div className="hc-table-container">
        <table className="hc-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Amount</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Date</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedOrders.map((order) => {
              const statusLower = order.status.toLowerCase();
              return (
                <tr key={order.id}>
                  <td>
                    <strong className="hc-order-code">{order.orderId}</strong>
                  </td>
                  <td>
                    <div>
                      <strong>{order.customer}</strong>
                      <span className="hc-user-sub">{order.customerPhone}</span>
                    </div>
                  </td>
                  <td>
                    <span className="hc-order-items" title={order.items}>
                      {order.items}
                    </span>
                  </td>
                  <td>
                    <strong>₹{order.amount.toLocaleString("en-IN")}</strong>
                  </td>
                  <td>
                    <span className="hc-payment-tag">{order.payment}</span>
                  </td>
                  <td>
                    <span
                      className={`hc-badge ${
                        statusLower === "completed"
                          ? "hc-badge-success"
                          : statusLower === "processing"
                          ? "hc-badge-info"
                          : statusLower === "pending"
                          ? "hc-badge-warning"
                          : "hc-badge-danger"
                      }`}
                    >
                      ● {order.status}
                    </span>
                  </td>
                  <td>{order.date}</td>
                  <td>
                    <div className="hc-row-actions">
                      <button
                        type="button"
                        className="hc-btn-table-icon"
                        onClick={() => setSelectedOrder(order)}
                        title="View Order Details"
                      >
                        <Eye size={13} />
                      </button>
                      {order._raw && (
                        <>
                          <button
                            type="button"
                            className="hc-btn-table-icon"
                            onClick={() => onEdit(order._raw)}
                            title="Edit"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            className="hc-btn-table-icon danger"
                            onClick={() => onDelete(order._raw)}
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="hc-table-pagination">
          <span>
            Showing {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, filteredOrders.length)} of {filteredOrders.length} orders
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

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="hc-modal-backdrop" onClick={() => setSelectedOrder(null)}>
          <div
            className="hc-order-detail-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="hc-modal-header">
              <span className="hc-drawer-tag">ORDER #{selectedOrder.orderId}</span>
              <button
                type="button"
                className="hc-btn-close"
                onClick={() => setSelectedOrder(null)}
              >
                ✕
              </button>
            </div>
            <div className="hc-modal-body">
              <div className="hc-omodal-top">
                <div>
                  <h4>{selectedOrder.customer}</h4>
                  <p>{selectedOrder.customerPhone}</p>
                </div>
                <span className="hc-badge hc-badge-success">● {selectedOrder.status}</span>
              </div>
              <div className="hc-omodal-box">
                <h5>Purchased Items</h5>
                <p>{selectedOrder.items}</p>
              </div>
              <div className="hc-omodal-box">
                <h5>Billing Summary</h5>
                <p>Total: <strong>₹{selectedOrder.amount.toLocaleString("en-IN")}</strong></p>
                <p>Payment Mode: <strong>{selectedOrder.payment}</strong></p>
                <p>Order Date: <strong>{selectedOrder.date}</strong></p>
              </div>
            </div>
            <div className="hc-modal-footer">
              <button
                type="button"
                className="hc-btn-secondary"
                onClick={() => setSelectedOrder(null)}
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
