export function getTimeAgo(dateString: string): string {
  if (!dateString || typeof dateString !== "string") return "N/A";

  try {
    // Prefer proper ISO timestamps
    if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(dateString)) {
      const iso = new Date(dateString);
      if (!Number.isNaN(iso.getTime())) return formatFromDate(iso);
    }

    // Existing DB stores DD/MM/YYYY, 12h time, in IST locale strings like:
    // "07/10/2025, 9:15:02 PM"
    const istDate = parseIstLocaleString(dateString);
    if (istDate) return formatFromDate(istDate);

    // Fallback: try native parse
    const native = new Date(dateString);
    if (!Number.isNaN(native.getTime())) return formatFromDate(native);
    return "N/A";
  } catch {
    return "N/A";
  }
}


function to24HourParts(input: string): { h: number; m: number; s: number } | null {
  if (!input) return null;
  const s = input.replace(/\s+/g, " ").trim().toUpperCase();

  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)\b/);
  if (!m) return null;

  let h = Number(m[1]);
  const min = Number(m[2]);
  const sec = m[3] ? Number(m[3]) : 0;
  const mer = m[4];

  if ([h, min, sec].some(Number.isNaN) || min > 59 || sec > 59 || h < 1 || h > 12) return null;
  if (mer === "PM" && h !== 12) h += 12;
  if (mer === "AM" && h === 12) h = 0;

  return { h, m: min, s: sec };
}

// Parse strings saved as IST locale (DD/MM/YYYY, h:mm[:ss] AM/PM) and convert to the actual instant (UTC)
function parseIstLocaleString(input: string): Date | null {
  const parts = String(input).trim().split(",");
  if (parts.length !== 2) return null;

  const datePart = parts[0].trim();
  const timePart = parts[1].trim();

  const [ddStr, mmStr, yyStr] = datePart.split("/").map((p) => p.trim());
  const dd = Number(ddStr);
  const mm = Number(mmStr);
  let yyyy = Number(yyStr);
  if (!dd || !mm || !yyyy) return null;
  if (yyyy < 100) yyyy += 2000;

  const t = to24HourParts(timePart);
  if (!t) return null;

  // Build the moment in IST, then convert to UTC epoch ms
  // IST offset is +05:30 => 330 minutes
  const istOffsetMinutes = 330;
  const utcMs = Date.UTC(yyyy, mm - 1, dd, t.h, t.m, t.s || 0) - istOffsetMinutes * 60 * 1000;
  const d = new Date(utcMs);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function formatFromDate(parsedDate: Date): string {
  const now = new Date();
  let diffMs = now.getTime() - parsedDate.getTime();
  if (diffMs < 0) diffMs = 0;

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffMonth / 12);

  if (diffSec < 3600) return "Added now";
  if (diffHr < 24) return `Added ${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  if (diffDay < 30) return `Added ${diffDay === 1 ? "a" : diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  if (diffMonth < 12) return `Added ${diffMonth} month${diffMonth === 1 ? "" : "s"} ago`;
  return `Added ${diffYear} year${diffYear === 1 ? "" : "s"} ago`;
}
