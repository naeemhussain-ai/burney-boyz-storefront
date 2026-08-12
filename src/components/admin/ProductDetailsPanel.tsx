// Read-only display of the CJ product data captured at import time -
// everything EditProductDialog's PricingEngine doesn't already cover
// (weight, dimensions, stock, shipping methods/countries, attributes, specs).
import type { AdminProduct } from "@/api/admin";
import { Badge } from "@/components/ui/badge";
import { displayPrice } from "@/lib/utils";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value ?? "-"}</p>
    </div>
  );
}

function totalStock(product: AdminProduct): number | null {
  if (!product.variants || product.variants.length === 0) return null;
  const total = product.variants.reduce((sum, v) => sum + (v.stock ?? 0), 0);
  return total;
}

export function ProductDetailsPanel({ product }: { product: AdminProduct }) {
  const stock = totalStock(product);
  const hasAttributes =
    product.attributes &&
    (product.attributes.logistics.length ||
      product.attributes.material.length ||
      product.attributes.packing.length);

  return (
    <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
      <h3 className="text-sm font-semibold">Product Details (from CJ)</h3>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="SKU" value={product.sku} />
        <Field label="Category" value={product.categoryName} />
        <Field label="Brand" value={product.brand} />
        <Field label="Weight" value={product.weight ? `${product.weight} g` : null} />
        <Field
          label="Packaging weight"
          value={product.packagingWeight ? `${product.packagingWeight} g` : null}
        />
        <Field label="Stock" value={stock !== null ? stock.toLocaleString() : null} />
      </div>

      {product.specifications?.customsCode && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Customs code" value={product.specifications.customsCode} />
          <Field label="Customs name" value={product.specifications.customsName} />
        </div>
      )}

      {hasAttributes && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Attributes</p>
          <div className="flex flex-wrap gap-1.5">
            {product.attributes!.logistics.map((v) => (
              <Badge key={`logistics-${v}`} variant="secondary" className="font-normal">
                {v}
              </Badge>
            ))}
            {product.attributes!.material.map((v) => (
              <Badge key={`material-${v}`} variant="outline" className="font-normal">
                {v}
              </Badge>
            ))}
            {product.attributes!.packing.map((v) => (
              <Badge key={`packing-${v}`} variant="outline" className="font-normal">
                {v}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Shipping methods{product.shippingCountries ? ` (${product.shippingCountries.length} destination(s))` : ""}
        </p>
        {!product.shippingMethods || Object.keys(product.shippingMethods).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No CJ freight quote available - shipping cost was left for manual entry above.
          </p>
        ) : (
          <div className="space-y-2">
            {Object.entries(product.shippingMethods).map(([country, quotes]) => (
              <div key={country} className="rounded-lg border bg-background p-2.5">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <Badge variant="default" className="font-normal">
                    {country}
                  </Badge>
                </div>
                <ul className="space-y-1">
                  {quotes.map((q, i) => (
                    <li
                      key={`${country}-${q.logisticName ?? i}`}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground">{q.logisticName ?? "Unknown carrier"}</span>
                      <span className="flex items-center gap-2">
                        {q.aging && <span className="text-xs text-muted-foreground">{q.aging} days</span>}
                        <span className="font-medium">{displayPrice(q.price)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {product.variants && product.variants.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Variants ({product.variants.length})</p>
          <div className="max-h-40 space-y-1 overflow-y-auto">
            {product.variants.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between rounded-lg border bg-background px-2.5 py-1.5 text-sm"
              >
                <span className="truncate">
                  {[v.option1, v.option2, v.option3].filter(Boolean).join(" / ") || v.name || v.sku || "Variant"}
                </span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  {v.weight && <span>{Number(v.weight).toFixed(0)} g</span>}
                  {v.length && v.width && v.height && (
                    <span>
                      {v.length}×{v.width}×{v.height} mm
                    </span>
                  )}
                  <span>{v.stock !== null ? `${v.stock} in stock` : "stock unknown"}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
