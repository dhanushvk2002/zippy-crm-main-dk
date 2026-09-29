import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function RecordModal({ mode, columns, values, onChange, onSave, onCancel, saving }) {
  const [showPassword, setShowPassword] = useState(false);
  useEffect(() => {
    if (!mode) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("crm-modal-open");
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.classList.remove("crm-modal-open");
    };
  }, [mode]);

  useEffect(() => {
    setShowPassword(false);
  }, [mode]);

  if (!mode) return null;

  function renderInput(field) {
    const value = values[field.key];
    const id = "field_" + field.key;

    if (field.readOnly) {
      return <input id={id} value={value ?? ""} disabled />;
    }

    if (field.type === "password") {
      const isEdit = mode === "edit";
      return (
        <div style={{ position: "relative" }}>
          <input
            id={id}
            type={showPassword ? "text" : "password"}
            value={value ?? ""}
            required={field.required && !isEdit}
            minLength={value ? 6 : undefined}
            autoComplete="new-password"
            placeholder={isEdit ? "Leave blank to keep current password" : "Min 6 characters"}
            style={{ width: "100%", paddingRight: 64, boxSizing: "border-box" }}
            onChange={(e) => onChange(field.key, e.target.value)}
          />
          <button type="button" onClick={() => setShowPassword((visible) => !visible)}>
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      );
    }

    if (field.type === "bool") {
      return (
        <input
          id={id}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(field.key, e.target.checked)}
        />
      );
    }

    if (field.type === "yesno") {
      return (
        <select
          id={id}
          value={value === true || value === "Yes" ? "Yes" : "No"}
          onChange={(e) => onChange(field.key, e.target.value)}
        >
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      );
    }

      if (field.type === "select") {
        return (
          <select
            id={id}
            value={value ?? ""}
            onChange={(e) => onChange(field.key, e.target.value)}
          >
            <option value="" disabled>— select —</option>
            {(field.options || []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
      }
    if (field.type === "number") {
      return (
        <input
          id={id}
          type="number"
          step="any"
          value={value ?? ""}
          required={field.required}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      );
    }

    if (field.type === "date") {
      return (
        <input
          id={id}
          type="date"
          value={value ?? ""}
          required={field.required}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      );
    }

    if (field.type === "time") {
      return (
        <input
          id={id}
          type="time"
          value={value ?? ""}
          required={field.required}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      );
    }

    if (field.type === "datetime") {
      return (
        <input
          id={id}
          type="datetime-local"
          value={value ?? ""}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      );
    }

    return (
      <input
        id={id}
        value={value ?? ""}
        required={field.required}
        onChange={(e) => onChange(field.key, e.target.value)}
      />
    );
  }

  return createPortal(
    <div
      className="zzc-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="zzc-modal">
        <h2>{mode === "edit" ? "Edit record" : "New record"}</h2>
        <form id="zzcModalForm" className="zzc-modal-form" onSubmit={onSave}>
          {columns.map((field) => (
            <div className="zzc-field" key={field.key}>
              <label htmlFor={"field_" + field.key}>
                {field.label}
                {field.required && !(field.type === "password" && mode === "edit") ? " *" : ""}
              </label>
              {renderInput(field)}
            </div>
          ))}
        </form>
        <div className="zzc-modal-actions">
          <button type="button" className="zzc-btn zzc-btn-outline" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="zzcModalForm" className="zzc-btn zzc-btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
