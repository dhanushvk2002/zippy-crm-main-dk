export const NAV_GROUPS = [
  {
    label: "Healthcare",
    items: [
      { key: "doctors", label: "Doctors" },
      { key: "pet_parents", label: "Pet Parents" },
      { key: "pets", label: "Pets" },
      { key: "appointments", label: "Appointments" },
      { key: "medical_records", label: "Medical Records" },
      { key: "vaccinations", label: "Vaccinations" },
      { key: "clinics", label: "Clinics & Hospitals" },
      { key: "availability_slots", label: "Availability Slots" },
      { key: "consultations", label: "Consultations" },
      { key: "prescriptions", label: "Prescriptions" },
    ],
  },
  {
    label: "Commerce",
    items: [
      { key: "products", label: "Medicines & Products" },
      { key: "inventory", label: "Inventory" },
      { key: "orders", label: "Orders" },
      { key: "payouts", label: "Payouts" },
      { key: "categories", label: "Categories" },
      { key: "brands", label: "Brands" },
      { key: "sellers", label: "Sellers & Stores" },
      { key: "warehouses", label: "Warehouses" },
    ],
  },
  {
    label: "Sales",
    items: [
      { key: "sales_executives", label: "Sales Executives" },
      { key: "reports", label: "Reports" },
      { key: "sales_crm", label: "Sales CRM" },
      { key: "regional_managers", label: "Regional Managers" },
      { key: "sales_managers", label: "Sales Managers" },
      { key: "pincode_coverage", label: "Pin Code Coverage" },
      { key: "executive_tasks", label: "Executive Tasks" },
      { key: "executive_alerts", label: "Executive Alerts" },
    ],
  },
  {
    label: "Administration",
    items: [
      { key: "user_roles", label: "User Roles" },
      { key: "addresses", label: "Addresses" },
      { key: "settings", label: "Settings" },
      { key: "notifications", label: "Notifications" },
      { key: "support_tickets", label: "Support Tickets" },
      { key: "audit_logs", label: "Audit Logs" },
    ],
  },
];

export const STATS = [
  { key: "profiles", label: "profiles", tableKey: "pet_parents" },
  { key: "pets", label: "pets", tableKey: "pets" },
  { key: "doctors", label: "doctors", tableKey: "doctors" },
  { key: "clinics", label: "clinics", tableKey: "clinics" },
  { key: "appointments", label: "appointments", tableKey: "appointments" },
  { key: "products", label: "products", tableKey: "products" },
  { key: "inventory", label: "inventory", tableKey: "inventory" },
  { key: "orders", label: "orders", tableKey: "orders" },
  { key: "sellers", label: "sellers", tableKey: "sellers" },
  { key: "services", label: "services", tableKey: "services" },
  { key: "payments", label: "payments", tableKey: "payments" },
  { key: "support_tickets", label: "support_tickets", tableKey: "support_tickets" },
];

export const SALES_TEAM_STATS = [
  { key: "regional_managers", label: "regional managers", tableKey: "regional_managers" },
  { key: "sales_managers", label: "sales managers", tableKey: "sales_managers" },
  { key: "sales_executives", label: "sales executives", tableKey: "sales_executives" },
];

export function findLabel(key) {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.key === key) return item.label;
    }
  }
  return key;
}

export function findGroupLabel(key) {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.key === key) return group.label;
    }
  }
  return null;
}
