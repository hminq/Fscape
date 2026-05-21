const moneyFormatter = new Intl.NumberFormat("vi-VN");

export function formatVnd(value) {
  if (value == null || Number.isNaN(Number(value))) return "Liên hệ";
  return `${moneyFormatter.format(Number(value))}đ`;
}

export function formatDisplayDate(dateStr) {
  if (!dateStr) return "-";
  // Handle both "YYYY-MM-DD" and full ISO timestamps
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

export function formatDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function addMonthsToDate(dateStr, monthsToAdd) {
  if (!dateStr || !monthsToAdd || monthsToAdd === "unlimited") return "";
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return "";
  const date = new Date(year, month - 1, day);
  date.setMonth(date.getMonth() + Number(monthsToAdd));
  return formatDateValue(date);
}
