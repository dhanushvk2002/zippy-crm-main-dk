// Helper for formatting dates and day names accurately (avoiding UTC timezone shifts)
export function formatAttendanceDateAndDay(dateStr) {
  if (!dateStr) return { formattedDate: "—", dayName: "—", rawDate: "" };
  const parts = String(dateStr).slice(0, 10).split("-");
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const dt = new Date(y, m, d);
    const dayName = dt.toLocaleDateString("en-US", { weekday: "long" });
    const formattedDate = dt.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return { formattedDate, dayName, rawDate: String(dateStr).slice(0, 10) };
  }
  return { formattedDate: String(dateStr), dayName: "—", rawDate: String(dateStr) };
}
