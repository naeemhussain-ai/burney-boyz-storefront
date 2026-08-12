// Shared pricing calculator for admin-managed products. Used by
// EditProductDialog (ongoing pricing edits) and the CJ Import Center
// (pricing configuration right after import) - one implementation, no
// duplicated pricing math between the two entry points.
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Only used to seed a sensible default before the admin has touched Compare
// Price themselves - not persisted or treated as a "real" business rule.
const DEFAULT_COMPARE_MARKUP = 0.3;

export interface PricingValues {
  shippingCost: number;
  sellingPrice: number;
  comparePrice: number | null;
}

export interface PricingEngineState {
  values: PricingValues;
  valid: boolean;
  error: string | null;
  profit: number;
  marginPercent: number | null;
}

function toNum(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function money(n: number): string {
  return (Number.isFinite(n) ? n : 0).toFixed(2);
}

export function PricingEngine({
  costPrice,
  initial,
  onChange,
}: {
  costPrice: number;
  initial: PricingValues;
  onChange: (state: PricingEngineState) => void;
}) {
  const initialCompare =
    initial.comparePrice !== null
      ? initial.comparePrice
      : initial.sellingPrice * (1 + DEFAULT_COMPARE_MARKUP);

  const [shippingCost, setShippingCost] = useState(money(initial.shippingCost));
  const [sellingPrice, setSellingPrice] = useState(money(initial.sellingPrice));
  const [profit, setProfit] = useState(
    money(initial.sellingPrice - costPrice - initial.shippingCost),
  );
  const [comparePrice, setComparePrice] = useState(money(Math.max(0, initialCompare)));
  const [compareTouched, setCompareTouched] = useState(false);

  // Shipping cost and Profit both drive Selling Price: selling = cost + shipping + profit.
  function recalcSellingFromProfit(nextShipping: number, nextProfit: number) {
    const nextSelling = Math.max(0, costPrice + nextShipping + nextProfit);
    setSellingPrice(money(nextSelling));
    if (!compareTouched) setComparePrice(money(nextSelling * (1 + DEFAULT_COMPARE_MARKUP)));
  }

  const handleShippingChange = (v: string) => {
    setShippingCost(v);
    recalcSellingFromProfit(toNum(v) ?? 0, toNum(profit) ?? 0);
  };

  const handleProfitChange = (v: string) => {
    setProfit(v);
    recalcSellingFromProfit(toNum(shippingCost) ?? 0, toNum(v) ?? 0);
  };

  // Manual override: editing Selling Price directly back-derives Profit
  // instead of the other way around.
  const handleSellingPriceChange = (v: string) => {
    setSellingPrice(v);
    const selling = toNum(v) ?? 0;
    setProfit(money(selling - costPrice - (toNum(shippingCost) ?? 0)));
    if (!compareTouched)
      setComparePrice(money(Math.max(0, selling) * (1 + DEFAULT_COMPARE_MARKUP)));
  };

  const handleComparePriceChange = (v: string) => {
    setCompareTouched(true);
    setComparePrice(v);
  };

  const resetCompareToAuto = () => {
    setCompareTouched(false);
    setComparePrice(money((toNum(sellingPrice) ?? 0) * (1 + DEFAULT_COMPARE_MARKUP)));
  };

  const sellingNum = toNum(sellingPrice);
  const shippingNum = toNum(shippingCost);
  const profitNum = toNum(profit) ?? 0;
  const compareNum = comparePrice.trim() === "" ? null : toNum(comparePrice);
  const marginPercent = sellingNum && sellingNum > 0 ? (profitNum / sellingNum) * 100 : null;

  let error: string | null = null;
  if (shippingNum === null || shippingNum < 0) error = "Shipping cost must be a number ≥ 0.";
  else if (sellingNum === null || sellingNum <= 0) error = "Selling price must be greater than 0.";
  else if (comparePrice.trim() !== "" && compareNum === null)
    error = "Compare price must be a number.";
  else if (compareNum !== null && sellingNum !== null && compareNum < sellingNum)
    error = "Compare price must be greater than or equal to selling price.";

  const valid = error === null;

  // Bubbles the current computed state up on every change; the parent form
  // reads it at submit time (mirrors the key-remount-per-product pattern the
  // rest of the admin edit form already relies on for state resets).
  useEffect(() => {
    onChange({
      values: {
        shippingCost: shippingNum ?? 0,
        sellingPrice: sellingNum ?? 0,
        comparePrice: valid ? compareNum : null,
      },
      valid,
      error,
      profit: profitNum,
      marginPercent,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shippingCost, sellingPrice, comparePrice]);

  return (
    <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
      <h3 className="text-sm font-semibold">Pricing Engine</h3>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="pe-cost">CJ Cost Price</Label>
          <Input
            id="pe-cost"
            value={`$${money(costPrice)}`}
            readOnly
            disabled
            className="bg-muted"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pe-shipping" title="Used only to estimate your profit margin here - checkout always charges CJ's live shipping quote for the customer's actual country, not this number.">
            Shipping Cost (for margin calc only)
          </Label>
          <Input
            id="pe-shipping"
            type="number"
            step="0.01"
            min="0"
            value={shippingCost}
            onChange={(e) => handleShippingChange(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pe-profit">Profit</Label>
          <Input
            id="pe-profit"
            type="number"
            step="0.01"
            value={profit}
            onChange={(e) => handleProfitChange(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pe-selling">Selling Price</Label>
          <Input
            id="pe-selling"
            type="number"
            step="0.01"
            min="0"
            value={sellingPrice}
            onChange={(e) => handleSellingPriceChange(e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="pe-compare">Compare Price</Label>
            {compareTouched && (
              <button
                type="button"
                onClick={resetCompareToAuto}
                className="text-xs font-medium text-primary hover:underline"
              >
                Reset to auto
              </button>
            )}
          </div>
          <Input
            id="pe-compare"
            type="number"
            step="0.01"
            min="0"
            value={comparePrice}
            onChange={(e) => handleComparePriceChange(e.target.value)}
            placeholder="Auto-calculated from selling price"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-lg bg-background p-3">
        <div>
          <p className="text-xs text-muted-foreground">Profit preview</p>
          <p className={cn("text-lg font-bold", profitNum < 0 && "text-destructive")}>
            ${money(profitNum)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Margin</p>
          <p
            className={cn(
              "text-lg font-bold",
              marginPercent !== null && marginPercent < 0 && "text-destructive",
            )}
          >
            {marginPercent === null ? "-" : `${marginPercent.toFixed(1)}%`}
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
