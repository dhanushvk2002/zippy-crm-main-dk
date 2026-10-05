import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Building2,
  Calendar,
  Check,
  Clock,
  Eye,
  EyeOff,
  FileText,
  IdCard,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  Target,
  Tag,
  User,
  UserPlus,
  X,
  ShieldAlert,
} from "lucide-react";
import NavIcon from "./NavIcon.jsx";
import { findLabel } from "../data.js";
import { sendMobileOtp, verifyMobileOtp } from "../api.js";

function RegionDatalist() {
  return (
    <datalist id="zzc-region-options">
      <option value="Karnataka" />
      <option value="Tamil Nadu" />
      <option value="Assam" />
      <option value="Kerala" />
      <option value="Andhra Pradesh" />
      <option value="Maharashtra" />
      <option value="Delhi" />
    </datalist>
  );
}

function getRecordTitle(key) {
  const titles = {
    sales_executives: "Sales Executive",
    sales_managers: "Sales Manager",
    regional_managers: "Regional Manager",
    pet_parents: "Pet Parent",
    pets: "Pet",
    medical_records: "Medical Record",
    vaccinations: "Vaccination",
    addresses: "Address",
    user_roles: "User Role",
    doctors: "Doctor",
    clinics: "Clinic / Hospital",
    availability_slots: "Availability Slot",
    doctor_documents: "Doctor Document",
    appointments: "Appointment",
    consultations: "Consultation",
    prescriptions: "Prescription",
    service_providers: "Service Provider",
    services: "Service",
    service_bookings: "Service Booking",
    products: "Medicine / Product",
    inventory: "Inventory Item",
    categories: "Category",
    brands: "Brand",
    sellers: "Seller / Store",
    warehouses: "Warehouse",
    carts: "Cart",
    cart_items: "Cart Item",
    orders: "Order",
    order_items: "Order Item",
    deliveries: "Delivery",
    payments: "Payment",
    refunds: "Refund",
    payouts: "Payout",
    commission_rules: "Commission Rule",
    gps_locations: "GPS Location",
    reviews: "Review",
    notifications: "Notification",
    vendor_membership_plans: "Membership Plan",
    plan_benefits: "Plan Benefit",
    vendors: "Vendor",
    support_tickets: "Support Ticket",
    geocoding_cache: "Geocoding Cache",
    audit_logs: "Audit Log",
    pincode_coverage: "Pin Code Coverage",
    executive_tasks: "Executive Task",
    executive_alerts: "Executive Alert",
  };
  if (titles[key]) return titles[key];
  const label = findLabel(key);
  if (label && typeof label === "string") {
    return label.replace(/s$/i, "");
  }
  return "Record";
}

function getFieldIcon(key, type) {
  const k = (key || "").toLowerCase();
  if (k.includes("phone") || k.includes("mobile") || k.includes("contact")) return Phone;
  if (k.includes("email") || type === "email") return Mail;
  if (k.includes("password") || type === "password") return LockKeyhole;
  if (
    k.includes("region") ||
    k.includes("address") ||
    k.includes("pincode") ||
    k.includes("postal") ||
    k.includes("location") ||
    k.includes("state")
  ) {
    return MapPin;
  }
  if (
    k.includes("city") ||
    k.includes("clinic") ||
    k.includes("hospital") ||
    k.includes("company") ||
    k.includes("warehouse") ||
    k.includes("store")
  ) {
    return Building2;
  }
  if (
    k.includes("name") ||
    k.includes("doctor") ||
    k.includes("parent") ||
    k.includes("patient") ||
    k.includes("customer") ||
    k.includes("user")
  ) {
    return User;
  }
  if (k.includes("target") || k.includes("goal")) return Target;
  if (
    k.includes("code") ||
    k.includes("id") ||
    k.includes("sku") ||
    k.includes("license") ||
    k.includes("reg_no")
  ) {
    return IdCard;
  }
  if (
    k.includes("active") ||
    k.includes("status") ||
    type === "bool" ||
    type === "yesno"
  ) {
    return ShieldCheck;
  }
  if (k.includes("date") || type === "date" || type === "datetime") return Calendar;
  if (k.includes("time") || type === "time") return Clock;
  if (
    k.includes("price") ||
    k.includes("amount") ||
    k.includes("cost") ||
    k.includes("fee") ||
    k.includes("total") ||
    k.includes("payout") ||
    type === "number"
  ) {
    return Target;
  }
  return Tag;
}

function getFieldPlaceholder(field) {
  const k = (field.key || "").toLowerCase();
  const label = field.label || field.key;
  if (k === "password") return "Minimum 6 characters";
  if (k === "region") return "Enter region";
  if (k === "city") return "Enter city";
  if (k === "email") return "name@example.com";
  if (k.includes("phone")) return "Enter phone number";
  if (k === "code") return "e.g. " + (field.default || "CODE-001");
  if (k === "monthly_target") return "Enter monthly target";
  return `Enter ${label.toLowerCase()}`;
}

function groupColumnsIntoSections(columns, tableKey) {
  const cleanColumns = (columns || []).filter((c) => c.key !== "is_phone_verified");
  if (
    tableKey === "sales_executives" ||
    tableKey === "sales_managers" ||
    tableKey === "regional_managers"
  ) {
    const basicKeys = ["name", "code", "phone", "email"];
    const accountKeys = ["password", "region", "city", "monthly_target"];
    const statusKeys = ["is_active", "status"];

    const basicCols = cleanColumns.filter((c) => basicKeys.includes(c.key));
    const accountCols = cleanColumns.filter((c) => accountKeys.includes(c.key));
    const statusCols = cleanColumns.filter((c) => statusKeys.includes(c.key));
    const otherCols = cleanColumns.filter(
      (c) =>
        !basicKeys.includes(c.key) &&
        !accountKeys.includes(c.key) &&
        !statusKeys.includes(c.key)
    );

    const sections = [];
    if (basicCols.length > 0) {
      sections.push({
        id: "basic",
        title: "Basic Information",
        Icon: User,
        columns: basicCols,
      });
    }
    if (accountCols.length > 0) {
      sections.push({
        id: "account",
        title: "Account & Location",
        Icon: LockKeyhole,
        columns: accountCols,
      });
    }
    if (statusCols.length > 0) {
      sections.push({
        id: "status",
        title: "Status",
        Icon: ShieldCheck,
        columns: statusCols,
        isSingle: statusCols.length === 1,
      });
    }
    if (otherCols.length > 0) {
      sections.push({
        id: "other",
        title: "Additional Details",
        Icon: FileText,
        columns: otherCols,
      });
    }
    return sections;
  }

  // Small table (<= 4 fields)
  if (columns.length <= 4) {
    return [
      {
        id: "details",
        title: "Record Information",
        Icon: FileText,
        columns,
      },
    ];
  }

  // Generic tables: partition into Status, Location/Contact/Account, and General
  const statusKeys = ["is_active", "status", "is_verified", "verified"];
  const locationKeys = [
    "password",
    "email",
    "phone",
    "mobile",
    "region",
    "city",
    "state",
    "address",
    "pincode",
    "postal_code",
    "latitude",
    "longitude",
    "location",
    "website",
  ];

  const statusCols = columns.filter(
    (c) =>
      statusKeys.includes(c.key.toLowerCase()) ||
      c.type === "yesno" ||
      c.type === "bool"
  );
  const statusKeySet = new Set(statusCols.map((c) => c.key));

  const locationCols = columns.filter(
    (c) =>
      !statusKeySet.has(c.key) &&
      locationKeys.some((lk) => c.key.toLowerCase().includes(lk))
  );
  const locationKeySet = new Set(locationCols.map((c) => c.key));

  const basicCols = columns.filter(
    (c) => !statusKeySet.has(c.key) && !locationKeySet.has(c.key)
  );

  const sections = [];
  if (basicCols.length > 0) {
    sections.push({
      id: "basic",
      title: "Basic Information",
      Icon: basicCols.some((c) => c.key.toLowerCase().includes("name"))
        ? User
        : FileText,
      columns: basicCols,
    });
  }
  if (locationCols.length > 0) {
    sections.push({
      id: "location",
      title: locationCols.some((c) => c.key === "password")
        ? "Account & Location"
        : "Contact & Location",
      Icon: locationCols.some((c) => c.key === "password")
        ? LockKeyhole
        : MapPin,
      columns: locationCols,
    });
  }
  if (statusCols.length > 0) {
    sections.push({
      id: "status",
      title: "Status",
      Icon: ShieldCheck,
      columns: statusCols,
      isSingle: statusCols.length === 1,
    });
  }

  return sections.length > 0
    ? sections
    : [{ id: "details", title: "Record Information", Icon: FileText, columns }];
}

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

  // Phone OTP verification states
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtpLoading, setPhoneOtpLoading] = useState(false);
  const [phoneOtpVerifying, setPhoneOtpVerifying] = useState(false);
  const [phoneOtpCountdown, setPhoneOtpCountdown] = useState(0);
  const [phoneOtpMsg, setPhoneOtpMsg] = useState("");

  useEffect(() => {
    let timer;
    if (phoneOtpCountdown > 0) {
      timer = setInterval(() => {
        setPhoneOtpCountdown((p) => p - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [phoneOtpCountdown]);

  // Reset modal state on mode change
  useEffect(() => {
    setShowPassword(false);
    setInputError("");
    setPhoneOtp("");
    setPhoneOtpSent(false);
    setPhoneOtpCountdown(0);
    setPhoneOtpMsg("");
  }, [mode]);

  async function handleSendPhoneOtp() {
    setInputError("");
    const cleanPhone = String(values.phone || "").replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      setInputError("Please enter a valid 10-digit phone number before requesting OTP.");
      return;
    }
    setPhoneOtpLoading(true);
    try {
      const res = await sendMobileOtp({
        phone: cleanPhone,
        purpose: "verify_phone",
        role: tableKey,
      });
      setPhoneOtpSent(true);
      setPhoneOtpCountdown(60);
      setPhoneOtpMsg(res.message || "OTP sent successfully!");
    } catch (err) {
      setInputError(err.message || "Failed to send verification OTP.");
    } finally {
      setPhoneOtpLoading(false);
    }
  }

  async function handleVerifyPhoneOtp() {
    setInputError("");
    const cleanPhone = String(values.phone || "").replace(/\D/g, "");
    if (!phoneOtp.trim()) {
      setInputError("Please enter the 6-digit OTP code.");
      return;
    }
    setPhoneOtpVerifying(true);
    try {
      await verifyMobileOtp({
        phone: cleanPhone,
        otp: phoneOtp.trim(),
        purpose: "verify_phone",
        role: tableKey,
      });
      onChange("is_phone_verified", true);
      setPhoneOtpSent(false);
      setPhoneOtp("");
      setPhoneOtpMsg("Mobile number verified successfully!");
    } catch (err) {
      setInputError(err.message || "Invalid or expired OTP code. Please try again.");
    } finally {
      setPhoneOtpVerifying(false);
    }
  }

  // If region was previously populated with "Bengaluru", normalize to "Karnataka"
  useEffect(() => {
    if (values.region === "Bengaluru") {
      onChange("region", "Karnataka");
      const hasCity = columns?.some((c) => c.key === "city");
      if (hasCity && (!values.city || values.city === "Karnataka")) {
        onChange("city", "Bengaluru");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.region]);

  function renderRegionQuickPills(currentVal) {
    return (
      <div className="zzc-region-quick-row">
        <span className="zzc-region-quick-label">Quick select:</span>
        <button
          type="button"
          className={`zzc-region-chip ${currentVal === "Karnataka" ? "active" : ""}`}
          onClick={() => {
            onChange("region", "Karnataka");
            if (columns?.some((c) => c.key === "city") && !values.city) {
              onChange("city", "Bengaluru");
            }
          }}
        >
          Karnataka
        </button>
        <button
          type="button"
          className={`zzc-region-chip ${currentVal === "Tamil Nadu" ? "active" : ""}`}
          onClick={() => {
            onChange("region", "Tamil Nadu");
            if (columns?.some((c) => c.key === "city") && !values.city) {
              onChange("city", "Chennai");
            }
          }}
        >
          Tamil Nadu
        </button>
      </div>
    );
  }

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

    if (field.key === "region") {
      return (
        <div className="zzc-region-field-wrapper">
          <RegionDatalist />
          <div className="zzc-region-input-row">
            <input
              id={id}
              type="text"
              list="zzc-region-options"
              value={value ?? ""}
              required={field.required}
              placeholder={placeholder || "Enter region"}
              autoComplete="off"
              onChange={(e) => onChange(field.key, e.target.value)}
            />
          </div>
          {renderRegionQuickPills(value)}
        </div>
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
    const isExecOrManager =
      tableKey === "sales_executives" ||
      tableKey === "sales_managers" ||
      tableKey === "regional_managers";

    if (mode === "new" && isExecOrManager && !values.is_phone_verified) {
      event.preventDefault();
      setInputError("Mobile number verification is required. Please verify the mobile number via OTP before creating this profile.");
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

    if (key === "region") {
      return (
        <div className="zzc-exec-field zzc-exec-field-region" key={key}>
          <RegionDatalist />
          <div className="zzc-exec-field-header">
            <label htmlFor={`field_${key}`}>
              {label}{field.required ? <span className="zzc-exec-required"> *</span> : ""}
            </label>
          </div>
          <div className="zzc-exec-input-shell zzc-exec-input-shell-region">
            <Icon size={15} aria-hidden="true" />
            <div className="zzc-exec-input-control">
              <input
                id={`field_${key}`}
                type="text"
                list="zzc-region-options"
                value={values[key] ?? ""}
                required={field.required}
                placeholder={placeholder || "Enter region"}
                autoComplete="off"
                onChange={(e) => onChange(key, e.target.value)}
              />
            </div>
          </div>
          {renderRegionQuickPills(values[key])}
        </div>
      );
    }

    if (key === "phone") {
      const isVerified = Boolean(values.is_phone_verified);
      const cleanPhone = String(values.phone || "").replace(/\D/g, "");
      const isExecOrManager =
        tableKey === "sales_executives" ||
        tableKey === "sales_managers" ||
        tableKey === "regional_managers";

      return (
        <div className="zzc-exec-field zzc-exec-field-full" key={key}>
          <div className="zzc-exec-field-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label htmlFor={`field_${key}`}>
              {label}{field.required ? <span className="zzc-exec-required"> *</span> : ""}
            </label>
            {isExecOrManager && (
              isVerified ? (
                <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "#16a34a", background: "#dcfce7", padding: "2px 8px", borderRadius: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <Check size={12} strokeWidth={3} /> Mobile Verified
                </span>
              ) : (
                <span style={{ fontSize: "0.74rem", fontWeight: 600, color: "#d97706", background: "#fef3c7", padding: "2px 8px", borderRadius: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <ShieldAlert size={12} /> Verification Required
                </span>
              )
            )}
          </div>

          <div className="zzc-exec-input-shell">
            <Icon size={15} aria-hidden="true" />
            <div className="zzc-exec-input-control">
              <input
                id={`field_${key}`}
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={values[key] ?? ""}
                required={field.required}
                placeholder="10-digit mobile number"
                onChange={(e) => {
                  const raw = e.target.value;
                  const digits = raw.replace(/\D/g, "");
                  if (digits.length > 10) return;
                  onChange(key, digits);
                  if (isVerified) {
                    onChange("is_phone_verified", false);
                  }
                  setInputError("");
                }}
              />
            </div>
          </div>

          {isExecOrManager && !isVerified && (
            <div style={{ marginTop: "8px", background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: "10px", padding: "10px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", flexWrap: "wrap", gap: "6px" }}>
                <span style={{ fontSize: "0.76rem", fontWeight: 600, color: "#334155" }}>
                  Mobile Number Verification
                </span>
                {phoneOtpMsg && (
                  <span style={{ fontSize: "0.72rem", color: "#0284c7", fontWeight: 500 }}>
                    {phoneOtpMsg}
                  </span>
                )}
              </div>

              {!phoneOtpSent ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    type="button"
                    style={{
                      padding: "5px 12px",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      borderRadius: "6px",
                      border: "none",
                      background: "#0284c7",
                      color: "#ffffff",
                      cursor: "pointer",
                      opacity: cleanPhone.length === 10 ? 1 : 0.6,
                    }}
                    disabled={cleanPhone.length !== 10 || phoneOtpLoading}
                    onClick={handleSendPhoneOtp}
                  >
                    {phoneOtpLoading ? "Sending OTP..." : "Send Verification OTP"}
                  </button>
                  <span style={{ fontSize: "0.74rem", color: "#64748b" }}>
                    {cleanPhone.length === 10 ? "Click to send verification code" : "Enter 10-digit number first"}
                  </span>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="6-digit OTP"
                    value={phoneOtp}
                    onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, ""))}
                    style={{
                      width: "140px",
                      padding: "6px 10px",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      letterSpacing: "0.2em",
                      textAlign: "center",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                    }}
                  />
                  <button
                    type="button"
                    style={{
                      padding: "6px 14px",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      borderRadius: "6px",
                      border: "none",
                      background: "#16a34a",
                      color: "#ffffff",
                      cursor: "pointer",
                    }}
                    disabled={phoneOtp.length < 4 || phoneOtpVerifying}
                    onClick={handleVerifyPhoneOtp}
                  >
                    {phoneOtpVerifying ? "Verifying..." : "Verify OTP"}
                  </button>
                  <button
                    type="button"
                    style={{
                      background: "none",
                      border: "none",
                      color: "#0284c7",
                      fontSize: "0.74rem",
                      fontWeight: 600,
                      cursor: phoneOtpCountdown > 0 ? "not-allowed" : "pointer",
                      textDecoration: "underline",
                    }}
                    disabled={phoneOtpCountdown > 0 || phoneOtpLoading}
                    onClick={handleSendPhoneOtp}
                  >
                    {phoneOtpCountdown > 0 ? `Resend (${phoneOtpCountdown}s)` : "Resend OTP"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    const isFullWidth =
      field.type === "textarea" ||
      key.toLowerCase().includes("address") ||
      key.toLowerCase().includes("description") ||
      key === "email";

    return (
      <div className={`zzc-exec-field ${isFullWidth ? "zzc-exec-field-full" : ""}`} key={key}>
        <label htmlFor={`field_${key}`}>
          {label}{field.required ? <span className="zzc-exec-required"> *</span> : ""}
        </label>
        <div className="zzc-exec-input-shell">
          <Icon size={15} aria-hidden="true" />
          <div className="zzc-exec-input-control">
            {(key === "is_active" || key === "status") && (field.type === "yesno" || !field.options) ? (
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

  const recordTitle = getRecordTitle(tableKey);
  const sections = groupColumnsIntoSections(columns, tableKey);
  const isEdit = mode === "edit";

  return createPortal(
    <div
      className="zzc-modal-overlay zzc-exec-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section className="zzc-exec-modal" aria-labelledby="zzc-exec-title">
        <header className="zzc-exec-header">
          <span className="zzc-exec-header-icon">
            <NavIcon name={tableKey} size={21} />
          </span>
          <div>
            <h2 id="zzc-exec-title">{isEdit ? `Edit ${recordTitle}` : `Add ${recordTitle}`}</h2>
            <p>
              {isEdit
                ? `Update existing ${recordTitle.toLowerCase()} record`
                : `Create a new ${recordTitle.toLowerCase()} profile`}
            </p>
          </div>
          <button
            type="button"
            className="zzc-exec-close"
            onClick={onCancel}
            aria-label="Close"
            title="Close"
          >
            <X size={17} />
          </button>
        </header>

        <div className="zzc-exec-layout">
          <form id="zzcModalForm" className="zzc-exec-form" onSubmit={handleModalSubmit}>
            {saveError && <div className="zzc-modal-error" role="alert">{saveError}</div>}
            {inputError && <div className="zzc-modal-error" role="alert">{inputError}</div>}

            {sections.map((section) => {
              const SectionIcon = section.Icon;
              return (
                <section className="zzc-exec-section" key={section.id}>
                  <h3>
                    <SectionIcon size={16} />
                    {section.title}
                  </h3>
                  <div
                    className={`zzc-exec-fields ${
                      section.isSingle ? "zzc-exec-fields-single" : ""
                    }`}
                  >
                    {section.columns.map((field) =>
                      renderExecutiveField(field.key, getFieldIcon(field.key, field.type), getFieldPlaceholder(field))
                    )}
                  </div>
                </section>
              );
            })}
          </form>
        </div>

        <footer className="zzc-exec-footer">
          <button
            type="button"
            className="zzc-btn zzc-btn-outline"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="zzcModalForm"
            className="zzc-btn zzc-btn-primary"
            disabled={saving}
          >
            {isEdit ? <Save size={15} /> : <UserPlus size={15} />}
            {saving
              ? isEdit
                ? "Saving…"
                : "Creating…"
              : isEdit
              ? "Save Changes"
              : `Create ${recordTitle}`}
          </button>
        </footer>
      </section>
    </div>,
    document.body
  );
}
