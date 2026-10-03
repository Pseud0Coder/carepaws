const DAY = 24 * 60 * 60 * 1000;

/** Parses YYYY-MM-DD as a UTC date, so night counts never drift with time zones. */
export function parseDay(s: string): number {
  const [y, m, d] = s.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function nightsBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  return Math.round((parseDay(end) - parseDay(start)) / DAY);
}

export function todayISO(offsetDays = 0): string {
  const now = new Date(Date.now() + offsetDays * DAY);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const formatINR = (n: number) => inr.format(n || 0);

export function formatDay(s: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) {
  if (!s) return "";
  return new Date(parseDay(s)).toLocaleDateString("en-IN", { ...opts, timeZone: "UTC" });
}

export function formatRange(start: string, end: string) {
  return `${formatDay(start)} – ${formatDay(end)}`;
}

export function timeAgo(iso?: string): string {
  if (!iso) return "just now";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function firstName(name?: string) {
  return (name || "").split(" ").filter((w) => !/^dr\.?$/i.test(w))[0] || "there";
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
