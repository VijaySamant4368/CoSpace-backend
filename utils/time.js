export function isDateTimeInPast(dateObj, timeStr) {
  // Expect dateObj to be a Date object
  if (!(dateObj instanceof Date) || isNaN(dateObj)) return false;

  const datePart = dateObj.toISOString().split('T')[0];
  const combined = new Date(`${datePart}T${timeStr}:00Z`);
  const now = new Date();

  return combined.getTime() < now.getTime();
}
