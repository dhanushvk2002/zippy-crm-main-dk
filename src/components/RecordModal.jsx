import ModernDatePicker from "./ModernDatePicker.jsx";

function formatFieldLabel(rawLabel, key) {
  const str = rawLabel || key || "";
  const lower = str.toLowerCase().trim();
  const map = {
    parent_id: "Parent ID",
    pet_id: "Pet ID",
    doctor_id: "Doctor ID",
    clinic_id: "Clinic ID",
    weight_kg: "Weight (kg)",
    is_active: "Active Status",
    full_name: "Full Name",
    phone: "Phone Number",
    phone_number: "Phone Number",
    email: "Email Address",
    pincode: "PIN Code",
    city: "City",
    created_at: "Created Date",
    updated_at: "Updated Date",
    dob: "Date of Birth",
    dob_estimated: "DOB Estimated",
    species: "Species",
    breed: "Breed",
    gender: "Gender",
    consultation_fee: "Consultation Fee (₹)",
    experience_years: "Experience (Years)",
    specializations: "Specialization",
    qualification: "Qualification",
    record_date: "Record Date",
    vaccine_name: "Vaccine Name",
    batch_number: "Batch Number",
    next_due_date: "Next Due Date",
    appointment_date: "Appointment Date",
    scheduled_time: "Scheduled Time",
    status: "Status"
  };
  if (map[lower]) return map[lower];
  return str
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getFieldPlaceholder(key, label) {
  const lower = (key || "").toLowerCase();
  if (lower.includes("parent_id")) return "e.g. 101";
  if (lower.includes("pet_id")) return "e.g. 204";
  if (lower.includes("doctor_id")) return "e.g. 12";
  if (lower === "name") return "e.g. Bella, Bruno or Charlie";
  if (lower === "full_name") return "e.g. Rajesh Sharma";
  if (lower === "species") return "e.g. Canine (Dog), Feline (Cat)";
  if (lower === "breed") return "e.g. Golden Retriever, Persian";
  if (lower === "gender") return "e.g. Male, Female";
  if (lower.includes("weight")) return "e.g. 14.5";
  if (lower.includes("phone")) return "e.g. +91 98765 43210";
  if (lower.includes("email")) return "e.g. contact@example.com";
  if (lower.includes("pincode")) return "e.g. 560034";
  if (lower.includes("city")) return "e.g. Bengaluru";
  if (lower.includes("fee")) return "e.g. 500";
  return `Enter ${label.toLowerCase()}...`;
}

function getSingularName(raw) {
  if (!raw) return "Record";
  const str = raw.trim();
  const lower = str.toLowerCase();
  if (lower === "pets") return "Pet";
  if (lower === "pet parents" || lower === "pet_parents") return "Pet Parent";
  if (lower === "doctors") return "Doctor";
  if (lower === "clinics" || lower === "clinics & hospitals" || lower === "clinics_and_hospitals") return "Clinic";
  if (lower === "medical records" || lower === "medical_records") return "Medical Record";
  if (lower === "vaccinations") return "Vaccination";
  if (lower === "appointments") return "Appointment";
  if (lower === "prescriptions") return "Prescription";
  if (lower === "consultations") return "Consultation";
  if (lower === "services") return "Service";
  if (lower === "products") return "Product";
  if (lower === "orders") return "Order";
  if (lower === "addresses") return "Address";
  if (str.endsWith("ies")) return str.slice(0, -3) + "y";
  if (str.endsWith("s") && !str.endsWith("ss")) return str.slice(0, -1);
  return str;
}

export default function RecordModal({ mode, columns, values, onChange, onSave, onCancel, saving, entityName }) {
  if (!mode) return null;

  const singular = getSingularName(entityName);
  const title = mode === "edit" ? `Edit ${singular}` : `New ${singular}`;
  const subtitle = mode === "edit"
    ? `Update ${singular.toLowerCase()} information and click Save to apply changes.`
    : `Fill in the required information below to register a new ${singular.toLowerCase()}.`;

  function renderInput(field, formattedLabel) {
    const value = values[field.key];
    const id = "field_" + field.key;
    const placeholder = getFieldPlaceholder(field.key, formattedLabel);

    if (field.readOnly) {
      return <input id={id} value={value ?? ""} disabled className="zzc-input-readonly" />;
    }

    if (field.type === "bool") {
      return (
        <label className="zzc-checkbox-label" htmlFor={id}>
          <input
            id={id}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(field.key, e.target.checked)}
          />
          <span>Enable / Yes</span>
        </label>
      );
    }

    if (field.type === "yesno") {
      return (
        <select
          id={id}
          value={value === true || value === "Yes" ? "Yes" : "No"}
          onChange={(e) => onChange(field.key, e.target.value)}
        >
          <option value="Yes">Yes (Active)</option>
          <option value="No">No (Inactive)</option>
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
          <option value="" disabled>— Select {formattedLabel} —</option>
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
        <ModernDatePicker
          id={id}
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

    // Multi-line for notes, description, etc.
    const isMultiline = field.type === "textarea" || ["notes", "description", "diagnosis", "address"].includes(field.key.toLowerCase());
    if (isMultiline) {
      return (
        <textarea
          id={id}
          rows={3}
          value={value ?? ""}
          required={field.required}
          placeholder={placeholder}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      );
    }

    return (
      <input
        id={id}
        value={value ?? ""}
        required={field.required}
        placeholder={placeholder}
        onChange={(e) => onChange(field.key, e.target.value)}
      />
    );
  }

  return (
    <div
      className="zzc-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="zzc-modal zzc-record-modal">
        {/* Header with Icon Badge */}
        <div className="zzc-modal-header">
          <div className="modal-header-icon-wrap">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <div className="zzc-modal-title-wrap">
            <h2>{title}</h2>
            <p className="zzc-modal-subtitle">{subtitle}</p>
          </div>
          <button className="rpt-call-close" onClick={onCancel} type="button" title="Close">✕</button>
        </div>

        {/* 2-Column Responsive Grid Form */}
        <form id="zzcModalForm" className="zzc-modal-form zzc-record-modal-grid" onSubmit={onSave}>
          {columns.map((field) => {
            const formattedLabel = formatFieldLabel(field.label, field.key);
            const isFullWidth = field.type === "bool" || ["notes", "description", "diagnosis", "address"].includes(field.key.toLowerCase());
            return (
              <div
                className={`zzc-field ${isFullWidth ? "zzc-field-full" : ""}`}
                key={field.key}
              >
                <label htmlFor={"field_" + field.key}>
                  <span>{formattedLabel}</span>
                  {field.required && <span className="zzc-req-star">*</span>}
                </label>
                {renderInput(field, formattedLabel)}
              </div>
            );
          })}
        </form>

        {/* Footer Actions */}
        <div className="zzc-modal-actions">
          <button type="button" className="zzc-btn zzc-btn-outline" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="zzcModalForm" className="zzc-btn zzc-btn-primary" disabled={saving}>
            {saving ? "Saving…" : (mode === "edit" ? "Save Changes" : `Save ${singular}`)}
          </button>
        </div>
      </div>
    </div>
  );
}
