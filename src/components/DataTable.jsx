import React from "react";
import {
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  Phone,
  MapPin,
  Calendar,
} from "lucide-react";
import DoctorAvatar from "./DoctorAvatar.jsx";
import "./DataTable.css";

function formatTableCell(val, colName) {
  if (val === null || val === undefined || val === "") return <span className="admin-cell-empty">—</span>;
  const s = String(val);
  const colLower = String(colName || "").toLowerCase();

  // Status pills
  if (colLower.includes("status") || colLower === "is_active") {
    const isAct = s === "Active" || s === "true" || s === "1" || s === "Yes";
    const isPending = s.toLowerCase().includes("pending");
    return (
      <span className={`admin-table-pill ${isAct ? "active" : isPending ? "pending" : "inactive"}`}>
        <span className="admin-pill-dot" />
        {s}
      </span>
    );
  }

  // Date formatting
  if (s.match(/^\d{4}-\d{2}-\d{2}/)) {
    const datePart = s.slice(0, 10);
    const timePart = s.length > 11 ? s.slice(11, 16) : null;
    return (
      <span className="admin-cell-date" title={s}>
        <Calendar size={12} className="admin-cell-icon" />
        <span>{datePart}</span>
        {timePart && <small style={{ opacity: 0.7, marginLeft: 4 }}>{timePart}</small>}
      </span>
    );
  }

  // Email
  if (s.includes("@") && s.includes(".")) {
    return (
      <span className="admin-cell-email" title={s}>
        <Mail size={12} className="admin-cell-icon" />
        <span>{s}</span>
      </span>
    );
  }

  // Phone
  if (s.match(/^\+?\d{10,13}$/)) {
    return (
      <span className="admin-cell-phone">
        <Phone size={12} className="admin-cell-icon" />
        <span>{s}</span>
      </span>
    );
  }

  // City / Location
  if (colLower.includes("city") || colLower.includes("location") || colLower.includes("region")) {
    return (
      <span className="admin-cell-location">
        <MapPin size={12} className="admin-cell-icon" />
        <span>{s}</span>
      </span>
    );
  }

  return <span>{s}</span>;
}

export default function DataTable({
  columns,
  pageItems,
  onEdit,
  onDelete,
  currentPage,
  totalPages,
  onPrevPage,
  onNextPage,
}) {
  return (
    <div className="admin-table-container">
      <div className="admin-table-card">
        <div className="admin-table-scroll">
          <table className="admin-data-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col}>
                    <span>{col.replace(/_/g, " ")}</span>
                  </th>
                ))}
                <th className="admin-th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr className="admin-empty-tr">
                  <td colSpan={columns.length + 1}>
                    <div className="admin-empty-state">
                      <div className="admin-empty-icon">
                        <Inbox size={32} />
                      </div>
                      <h4>No records found</h4>
                      <p>There are no entries in this table matching your query.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                pageItems.map(({ row, index }) => (
                  <tr key={index} className="admin-table-row">
                    {row.map((cell, i) => {
                      const colName = columns[i] || "";
                      const isNameCol =
                        colName.toLowerCase().includes("name") &&
                        !colName.toLowerCase().includes("user_name");

                      return (
                        <td key={i}>
                          {isNameCol && cell ? (
                            <div className="admin-cell-name-wrap">
                              <DoctorAvatar name={String(cell)} size={28} showOnline={false} />
                              <strong className="admin-cell-name-text">{String(cell)}</strong>
                            </div>
                          ) : (
                            formatTableCell(cell, colName)
                          )}
                        </td>
                      );
                    })}
                    <td className="admin-td-actions">
                      <div className="admin-action-btn-group">
                        <button
                          type="button"
                          className="admin-action-btn edit"
                          onClick={() => onEdit(index)}
                          title="Edit Record"
                        >
                          <Pencil size={13} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          className="admin-action-btn delete"
                          onClick={() => onDelete(index)}
                          title="Delete Record"
                        >
                          <Trash2 size={13} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="admin-pagination-footer">
          <span className="admin-page-count">
            Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
          </span>

          <div className="admin-pagination-controls">
            <button
              type="button"
              className="admin-page-nav-btn"
              disabled={currentPage <= 1}
              onClick={onPrevPage}
              title="Previous Page"
            >
              <ChevronLeft size={15} />
              <span>Previous</span>
            </button>
            <span className="admin-page-indicator">{currentPage}</span>
            <button
              type="button"
              className="admin-page-nav-btn"
              disabled={currentPage >= totalPages}
              onClick={onNextPage}
              title="Next Page"
            >
              <span>Next</span>
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
