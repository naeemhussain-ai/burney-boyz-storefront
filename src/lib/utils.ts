import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Product descriptions from the catalog API can contain raw HTML (imported
// from CJ). React already escapes it as text (no injection risk), but
// showing literal tag characters looks broken - strip them for display.
export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

// Catalog price fields come back as either numbers or numeric strings
// (Prisma Decimal serializes to string), so this coerces before formatting.
export function displayPrice(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "Not Available";
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : "Not Available";
}
