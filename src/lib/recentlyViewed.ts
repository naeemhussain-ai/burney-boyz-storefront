// Sprint 8 / Step 21 - "Recently Viewed Products". Anonymous, localStorage-
// backed (no account required, unlike the Wishlist) - mirrors the small
// localStorage-utility pattern already used by src/lib/cartToken.ts.
const STORAGE_KEY = "burneyboyz_recently_viewed";
const MAX_ITEMS = 12;

export interface RecentlyViewedEntry {
  id: string;
  slug: string;
  name: string;
  image: string | null;
  myPrice: number | string | null;
  viewedAt: string;
}

function read(): RecentlyViewedEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as RecentlyViewedEntry[]) : [];
  } catch {
    return [];
  }
}

function write(entries: RecentlyViewedEntry[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage full/unavailable (e.g. private browsing) - recently-viewed is
    // a nice-to-have, never worth surfacing an error for.
  }
}

/** Records a product view, most-recent first, deduped, capped at 12. */
export function recordProductView(product: Omit<RecentlyViewedEntry, "viewedAt">) {
  const existing = read().filter((e) => e.id !== product.id);
  const next = [{ ...product, viewedAt: new Date().toISOString() }, ...existing].slice(0, MAX_ITEMS);
  write(next);
}

export function getRecentlyViewed(excludeId?: string): RecentlyViewedEntry[] {
  const entries = read();
  return excludeId ? entries.filter((e) => e.id !== excludeId) : entries;
}
