import { Check, Download, Eye, Loader2 } from "lucide-react";
import type { CjProductSummary } from "@/api/cjImport";
import { Button } from "@/components/ui/button";
import { displayPrice } from "@/lib/utils";

export function CjProductCard({
  product,
  imported,
  importing,
  onPreview,
  onImport,
}: {
  product: CjProductSummary;
  imported: boolean;
  importing: boolean;
  onPreview: () => void;
  onImport: () => void;
}) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-card transition-shadow hover:shadow-soft">
      <button
        type="button"
        onClick={onPreview}
        className="relative block aspect-square overflow-hidden bg-muted"
      >
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-4 text-center text-xs text-muted-foreground">
            No image available
          </div>
        )}

        {imported && (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-bold text-primary-foreground shadow-sm">
            <Check className="h-3 w-3" /> Imported
          </span>
        )}

        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-foreground shadow-lg">
            <Eye className="h-3.5 w-3.5" /> Preview
          </span>
        </div>
      </button>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="line-clamp-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {product.categoryName || "Uncategorized"}
        </p>
        <p className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug">
          {product.name}
        </p>
        <p className="mt-auto text-lg font-extrabold text-foreground">
          {displayPrice(product.price)}
        </p>

        <Button
          size="sm"
          className="mt-2 w-full gap-2 rounded-xl font-semibold"
          disabled={imported || importing}
          onClick={onImport}
        >
          {imported ? (
            <>
              <Check className="h-4 w-4" /> Imported
            </>
          ) : importing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Importing…
            </>
          ) : (
            <>
              <Download className="h-4 w-4" /> Import
            </>
          )}
        </Button>
      </div>
    </article>
  );
}
