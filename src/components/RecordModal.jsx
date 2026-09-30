import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Building2, Eye, EyeOff, IdCard, LockKeyhole, Mail, MapPin, Phone, ShieldCheck, Target, TrendingUp, User, UserPlus, Users, X } from "lucide-react";

export default function RecordModal({ mode, tableKey, columns, values, onChange, onSave, onCancel, saving, saveError }) {
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

  const [showPassword, setShowPassword] = useState(false);
  const [inputError, setInputError] = useState("");
  useEffect(() => {
    setShowPassword(false);
    setInputError("");
  }, [mode]);

  if (!mode) return null;

  function renderInput(field, placeholder) {
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
            placeholder={placeholder || (isEdit ? "Leave blank to keep current password" : "Min 6 characters")}
            style={{ width: "100%", paddingRight: 40, boxSizing: "border-box" }}
            onChange={(e) => {
              if (e.target.value.length > 10) {
                setInputError("Password cannot exceed 10 characters.");
                return;
              }
              setInputError("");
              onChange(field.key, e.target.value);
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            title={showPassword ? "Hide password" : "Show password"}
            aria-label={showPassword ? "Hide password" : "Show password"}
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              width: 28,
              height: 28,
              display: "grid",
              placeItems: "center",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#0284c7",
            }}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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
          placeholder={placeholder}
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

    if (field.key.toLowerCase().includes("phone")) {
      return (
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          value={value ?? ""}
          required={field.required}
          placeholder={placeholder}
          onChange={(e) => {
            const rawValue = e.target.value;
            const digits = rawValue.replace(/\D/g, "");
            if (digits.length > 10) {
              setInputError("Phone number cannot exceed 10 digits.");
              return;
            }
            if (rawValue !== digits) {
              setInputError("Phone number can contain digits only.");
            } else {
              setInputError("");
            }
            onChange(field.key, digits);
          }}
        />
      );
    }

    return (
      <input
        id={id}
        type={field.type === "email" ? "email" : "text"}
        value={value ?? ""}
        required={field.required}
        placeholder={placeholder}
        autoComplete={field.type === "email" ? "email" : undefined}
        onChange={(e) => onChange(field.key, e.target.value)}
      />
    );
  }

  function handleModalSubmit(event) {
    if (inputError) {
      event.preventDefault();
      return;
    }
    onSave(event);
  }

  function renderExecutiveField(key, Icon, placeholder) {
    const field = columns.find((item) => item.key === key);
    if (!field) return null;
    const executiveLabels = {
      name: "Name",
      code: "Code",
      phone: "Phone",
      email: "Email",
      password: "Password",
      region: "Region",
      city: "City",
      monthly_target: "Monthly Target",
      is_active: "Status",
    };
    const label = executiveLabels[key] || field.label || key;

    return (
      <div className="zzc-exec-field" key={key}>
        <label htmlFor={`field_${key}`}>
          {label}{field.required ? <span className="zzc-exec-required"> *</span> : ""}
        </label>
        <div className="zzc-exec-input-shell">
          <Icon size={15} aria-hidden="true" />
          <div className="zzc-exec-input-control">
            {key === "is_active" ? (
              <select
                id={`field_${key}`}
                value={values[key] === "No" || values[key] === false ? "No" : "Yes"}
                onChange={(event) => onChange(key, event.target.value)}
              >
                <option value="Yes">Active</option>
                <option value="No">Inactive</option>
              </select>
            ) : (
              renderInput(field, placeholder)
            )}
          </div>
        </div>
      </div>
    );
  }

  if (mode === "new" && tableKey === "sales_executives") {
    return createPortal(
      <div className="zzc-modal-overlay zzc-exec-overlay" onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}>
        <section className="zzc-exec-modal" aria-labelledby="zzc-exec-title">
          <header className="zzc-exec-header">
            <span className="zzc-exec-header-icon"><UserPlus size={21} /></span>
            <div>
              <h2 id="zzc-exec-title">Add Sales Executive</h2>
              <p>Create a new sales executive profile</p>
            </div>
            <button type="button" className="zzc-exec-close" onClick={onCancel} aria-label="Close" title="Close">
              <X size={17} />
            </button>
          </header>

          <div className="zzc-exec-layout">
            <aside className="zzc-exec-aside">
              <div className="zzc-exec-illustration"><TrendingUp size={46} /></div>
              <h3>Build a stronger sales team</h3>
              <p>Add new executives and help your business grow faster.</p>
              <div className="zzc-exec-benefit"><Users size={17} /><span><strong>Manage Team</strong><small>Keep your sales team organized</small></span></div>
              <div className="zzc-exec-benefit"><TrendingUp size={17} /><span><strong>Track Performance</strong><small>Monitor goals and progress</small></span></div>
              <div className="zzc-exec-benefit"><ShieldCheck size={17} /><span><strong>Drive Growth</strong><small>Achieve more together</small></span></div>
            </aside>

            <form id="zzcModalForm" className="zzc-exec-form" onSubmit={handleModalSubmit}>
              {saveError && <div className="zzc-modal-error" role="alert">{saveError}</div>}
              {inputError && <div className="zzc-modal-error" role="alert">{inputError}</div>}
              <section className="zzc-exec-section">
                <h3><User size={16} />Basic Information</h3>
                <div className="zzc-exec-fields">
                  {renderExecutiveField("name", User, "Enter full name")}
                  {renderExecutiveField("code", IdCard, "e.g. SE-001")}
                  {renderExecutiveField("phone", Phone, "Enter phone number")}
                  {renderExecutiveField("email", Mail, "name@example.com")}
                </div>
              </section>

              <section className="zzc-exec-section">
                <h3><LockKeyhole size={16} />Account &amp; Location</h3>
                <div className="zzc-exec-fields">
                  {renderExecutiveField("password", LockKeyhole, "Minimum 6 characters")}
                  {renderExecutiveField("region", MapPin, "Enter region")}
                  {renderExecutiveField("city", Building2, "Enter city")}
                  {renderExecutiveField("monthly_target", Target, "Enter monthly target")}
                </div>
              </section>

              <section className="zzc-exec-section">
                <h3><Users size={16} />Status &amp; Assignment</h3>
                <div className="zzc-exec-fields zzc-exec-fields-single">
                  {renderExecutiveField("is_active", ShieldCheck)}
                </div>
              </section>
            </form>
          </div>

          <footer className="zzc-exec-footer">
            <button type="button" className="zzc-btn zzc-btn-outline" onClick={onCancel} disabled={saving}>Cancel</button>
            <button type="submit" form="zzcModalForm" className="zzc-btn zzc-btn-primary" disabled={saving}>
              <UserPlus size={15} />{saving ? "Creating…" : "Create Executive"}
            </button>
          </footer>
        </section>
      </div>,
      document.body
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
        <form id="zzcModalForm" className="zzc-modal-form" onSubmit={handleModalSubmit}>
          {saveError && <div className="zzc-modal-error" role="alert">{saveError}</div>}
          {inputError && <div className="zzc-modal-error" role="alert">{inputError}</div>}
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
