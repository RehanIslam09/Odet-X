/**
 * Returns a time-of-day greeting ("Good morning", etc.) for the given date.
 */
export function getTimeOfDayGreeting(date: Date = new Date()): string {
  const hour = date.getHours();

  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

/**
 * Formats a date as "Wednesday, July 15" for the dashboard hero.
 */
export function formatDashboardDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}