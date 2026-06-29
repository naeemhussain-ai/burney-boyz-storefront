import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { Minus, Plus, Trash2, ShoppingBag, Truck, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

export function CartDrawer() {
  const { items, isOpen, closeCart, updateQuantity, removeItem, subtotal } = useCart();
  const freeShippingThreshold = 50;
  const remaining = Math.max(0, freeShippingThreshold - subtotal);

  return (
    <Sheet open={isOpen} onOpenChange={(o) => !o && closeCart()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Your Cart
            {items.length > 0 && (
              <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-white">
                {items.length}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-muted">
              <ShoppingBag className="h-9 w-9 text-muted-foreground/50" />
            </div>
            <div>
              <p className="font-semibold">Your cart is empty</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Discover trending products and start shopping!
              </p>
            </div>
            <Button onClick={closeCart} asChild className="rounded-full">
              <Link to="/shop">Browse Products</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Free shipping progress */}
            {remaining > 0 && (
              <div className="bg-primary-soft/60 px-6 py-3 text-xs">
                <div className="flex items-center justify-between text-primary">
                  <span className="flex items-center gap-1 font-medium">
                    <Truck className="h-3.5 w-3.5" />
                    Add ${remaining.toFixed(2)} more for free shipping
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary/20">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, (subtotal / freeShippingThreshold) * 100)}%` }}
                  />
                </div>
              </div>
            )}
            {remaining === 0 && (
              <div className="flex items-center gap-2 bg-green-50 px-6 py-3 text-xs font-medium text-green-700">
                <Truck className="h-3.5 w-3.5" /> You qualify for free shipping! 🎉
              </div>
            )}

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <ul className="space-y-4">
                {items.map((item) => (
                  <li
                    key={`${item.id}-${item.variant ?? ""}`}
                    className="flex gap-3 rounded-xl border bg-card p-3"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-20 w-20 flex-none rounded-lg object-cover"
                    />
                    <div className="flex flex-1 flex-col gap-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-semibold leading-tight">
                            {item.name}
                          </p>
                          {item.variant && (
                            <p className="mt-0.5 text-xs text-muted-foreground">{item.variant}</p>
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(item.id, item.variant)}
                          className="flex-shrink-0 rounded-full p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Remove"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="mt-auto flex items-center justify-between">
                        <div className="flex items-center overflow-hidden rounded-full border">
                          <button
                            className="grid h-7 w-7 place-items-center transition hover:bg-muted"
                            onClick={() => updateQuantity(item.id, item.quantity - 1, item.variant)}
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-medium">{item.quantity}</span>
                          <button
                            className="grid h-7 w-7 place-items-center transition hover:bg-muted"
                            onClick={() => updateQuantity(item.id, item.quantity + 1, item.variant)}
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <p className="text-sm font-bold">
                          ${(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Footer */}
            <div className="border-t bg-card px-6 py-5 space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-semibold text-foreground">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span className={subtotal >= 50 ? "font-semibold text-green-600" : "text-foreground"}>
                    {subtotal >= 50 ? "FREE" : "Calculated at checkout"}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold">
                  <span>Estimated total</span>
                  <span className="text-lg">${subtotal.toFixed(2)}</span>
                </div>
              </div>

              <Button
                className="w-full rounded-xl font-semibold"
                size="lg"
                onClick={() =>
                  toast.info("Checkout coming soon!", {
                    description: "Payment processing will be available in the next update.",
                  })
                }
              >
                Proceed to Checkout
              </Button>

              <button
                onClick={closeCart}
                className="w-full text-center text-sm text-muted-foreground hover:text-primary transition"
              >
                Continue shopping
              </button>

              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Secure checkout
                </span>
                <span className="flex items-center gap-1">
                  <Truck className="h-3.5 w-3.5 text-primary" /> Free over $50
                </span>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
