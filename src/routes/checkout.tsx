import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { AlertTriangle, Loader2, ShoppingBag, Tag, Truck } from "lucide-react";
import { useCart } from "@/lib/cart";
import {
  createCheckoutSession,
  fetchStripeStatus,
  fetchShippingQuote,
  CheckoutApiError,
  ShippingQuoteApiError,
} from "@/api/checkout";
import { createDirectOrder, OrderApiError } from "@/api/order";
import { PageHero } from "@/components/layout/PageHero";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { displayPrice } from "@/lib/utils";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout - Burney Boyz" },
      { name: "description", content: "Complete your shipping and billing details." },
    ],
    links: [{ rel: "canonical", href: "/checkout" }],
  }),
  component: CheckoutPage,
});

const COUNTRIES = [
  "United States",
  "Canada",
  "United Kingdom",
  "Australia",
  "Pakistan",
  "India",
  "United Arab Emirates",
  "Germany",
  "France",
  "Netherlands",
];

const emptyAddress = {
  fullName: "",
  addressLine1: "",
  addressLine2: "",
  country: "",
  state: "",
  city: "",
  postalCode: "",
};

type Address = typeof emptyAddress;

const addressSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(100),
  addressLine1: z.string().trim().min(3, "Address is required").max(160),
  addressLine2: z.string().trim().max(160).optional().or(z.literal("")),
  country: z.string().trim().min(1, "Country is required"),
  state: z.string().trim().min(1, "State / Province is required").max(80),
  city: z.string().trim().min(1, "City is required").max(80),
  postalCode: z.string().trim().min(2, "Postal code is required").max(20),
});

const checkoutSchema = z.object({
  email: z.string().trim().email("Please enter a valid email"),
  phone: z.string().trim().min(7, "Please enter a valid phone number").max(20),
  shipping: addressSchema,
  billing: addressSchema,
});

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function AddressFields({
  value,
  onChange,
  errors,
  prefix,
  disabled,
}: {
  value: Address;
  onChange: (next: Address) => void;
  errors: Record<string, string>;
  prefix: "shipping" | "billing";
  disabled?: boolean;
}) {
  const err = (field: keyof Address) => errors[`${prefix}.${field}`];
  const set = (field: keyof Address) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [field]: e.target.value });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor={`${prefix}-fullName`}>Full name</Label>
        <Input
          id={`${prefix}-fullName`}
          value={value.fullName}
          onChange={set("fullName")}
          disabled={disabled}
          className="mt-1.5"
        />
        {err("fullName") && <p className="mt-1 text-xs text-destructive">{err("fullName")}</p>}
      </div>

      <div className="sm:col-span-2">
        <Label htmlFor={`${prefix}-addressLine1`}>Address</Label>
        <Input
          id={`${prefix}-addressLine1`}
          placeholder="Street address"
          value={value.addressLine1}
          onChange={set("addressLine1")}
          disabled={disabled}
          className="mt-1.5"
        />
        {err("addressLine1") && (
          <p className="mt-1 text-xs text-destructive">{err("addressLine1")}</p>
        )}
      </div>

      <div className="sm:col-span-2">
        <Label htmlFor={`${prefix}-addressLine2`}>Apartment, suite, etc. (optional)</Label>
        <Input
          id={`${prefix}-addressLine2`}
          value={value.addressLine2}
          onChange={set("addressLine2")}
          disabled={disabled}
          className="mt-1.5"
        />
      </div>

      <div>
        <Label htmlFor={`${prefix}-country`}>Country</Label>
        <Select
          value={value.country}
          onValueChange={(v) => onChange({ ...value, country: v })}
          disabled={disabled}
        >
          <SelectTrigger id={`${prefix}-country`} className="mt-1.5">
            <SelectValue placeholder="Select a country" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {err("country") && <p className="mt-1 text-xs text-destructive">{err("country")}</p>}
      </div>

      <div>
        <Label htmlFor={`${prefix}-state`}>State / Province</Label>
        <Input
          id={`${prefix}-state`}
          value={value.state}
          onChange={set("state")}
          disabled={disabled}
          className="mt-1.5"
        />
        {err("state") && <p className="mt-1 text-xs text-destructive">{err("state")}</p>}
      </div>

      <div>
        <Label htmlFor={`${prefix}-city`}>City</Label>
        <Input
          id={`${prefix}-city`}
          value={value.city}
          onChange={set("city")}
          disabled={disabled}
          className="mt-1.5"
        />
        {err("city") && <p className="mt-1 text-xs text-destructive">{err("city")}</p>}
      </div>

      <div>
        <Label htmlFor={`${prefix}-postalCode`}>Postal code</Label>
        <Input
          id={`${prefix}-postalCode`}
          value={value.postalCode}
          onChange={set("postalCode")}
          disabled={disabled}
          className="mt-1.5"
        />
        {err("postalCode") && <p className="mt-1 text-xs text-destructive">{err("postalCode")}</p>}
      </div>
    </div>
  );
}

function CheckoutPage() {
  const { items: cartItems, subtotal, isLoading } = useCart();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [shipping, setShipping] = useState<Address>(emptyAddress);
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [billing, setBilling] = useState<Address>(emptyAddress);
  const [coupon, setCoupon] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sprint 10 / Step 25 - Real Shipping Pricing. "Shipping" is no longer a
  // flat/free rate the customer picks - it's CJ's real quoted cost for this
  // cart shipping to the address's country (see
  // backend/src/services/cjOrder.service.js#quoteShipping), fetched live as
  // soon as a country is selected.
  const shippingQuoteQuery = useQuery({
    queryKey: ["checkout", "shipping-quote", shipping.country],
    queryFn: () => fetchShippingQuote(shipping.country),
    enabled: Boolean(shipping.country),
    retry: false,
  });
  const shippingCost = shippingQuoteQuery.data?.shippingCost;
  const shippingReady = shipping.country ? shippingQuoteQuery.isSuccess : false;
  const total = round2(subtotal + (shippingCost ?? 0));

  // Sprint 10 / Step 24 - Order Flow (Stripe temporarily off). Stripe
  // Checkout is used automatically once real credentials are configured
  // (see /api/health's checks.stripe) - until then, orders are placed
  // directly as 'pending' so Cart → Checkout → Place Order keeps working.
  const stripeStatusQuery = useQuery({
    queryKey: ["checkout", "stripe-status"],
    queryFn: fetchStripeStatus,
    staleTime: 60_000,
  });
  const stripeEnabled = stripeStatusQuery.data ?? false;

  const checkoutMutation = useMutation({
    mutationFn: createCheckoutSession,
    onSuccess: (data) => {
      // Hosted Stripe Checkout - hard navigate away, no Stripe.js/publishable
      // key needed on the frontend at all.
      window.location.href = data.url;
    },
    onError: (err) => {
      toast.error(
        err instanceof CheckoutApiError
          ? err.message
          : "Couldn't start checkout. Please try again.",
      );
    },
  });

  const directOrderMutation = useMutation({
    mutationFn: createDirectOrder,
    onSuccess: async (order) => {
      await queryClient.invalidateQueries({ queryKey: ["cart"] });
      navigate({ to: "/payment-success", search: { order_id: order.id } });
    },
    onError: (err) => {
      toast.error(
        err instanceof OrderApiError ? err.message : "Couldn't place your order. Please try again.",
      );
    },
  });

  const isPlacingOrder = checkoutMutation.isPending || directOrderMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const effectiveBilling = billingSameAsShipping ? shipping : billing;
    const result = checkoutSchema.safeParse({
      email,
      phone,
      shipping,
      billing: effectiveBilling,
    });

    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) errs[issue.path.join(".")] = issue.message;
      setErrors(errs);
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setErrors({});

    if (!shippingReady) {
      toast.error("We couldn't calculate shipping for this address yet - please wait a moment or try a different country.");
      return;
    }

    const payload = {
      customer: { email, phone },
      shipping,
      billing: effectiveBilling,
      couponCode: coupon.trim() || undefined,
    };

    if (stripeEnabled) {
      checkoutMutation.mutate(payload);
    } else {
      directOrderMutation.mutate(payload);
    }
  };

  return (
    <>
      <PageHero
        eyebrow="Checkout"
        title="Checkout"
        description="Enter your shipping and billing details, then continue to secure payment."
      />

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="mx-auto max-w-2xl space-y-4">
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        ) : cartItems.length === 0 ? (
          <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border bg-card p-16 text-center">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-muted">
              <ShoppingBag className="h-9 w-9 text-muted-foreground/50" />
            </div>
            <div>
              <p className="font-semibold">Your cart is empty</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add something to your cart before checking out.
              </p>
            </div>
            <Button asChild className="rounded-full">
              <Link to="/shop">Browse Shop</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              {/* Contact */}
              <div className="rounded-2xl border bg-card p-6">
                <h2 className="text-lg font-bold">Contact</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1.5"
                    />
                    {errors.email && (
                      <p className="mt-1 text-xs text-destructive">{errors.email}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-1.5"
                    />
                    {errors.phone && (
                      <p className="mt-1 text-xs text-destructive">{errors.phone}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Shipping address */}
              <div className="rounded-2xl border bg-card p-6">
                <h2 className="text-lg font-bold">Shipping Address</h2>
                <div className="mt-4">
                  <AddressFields
                    value={shipping}
                    onChange={setShipping}
                    errors={errors}
                    prefix="shipping"
                  />
                </div>
              </div>

              {/* Billing address */}
              <div className="rounded-2xl border bg-card p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-bold">Billing Address</h2>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="sameAsShipping"
                      checked={billingSameAsShipping}
                      onCheckedChange={(checked) => setBillingSameAsShipping(checked === true)}
                    />
                    <Label htmlFor="sameAsShipping" className="cursor-pointer text-sm font-normal">
                      Same as shipping
                    </Label>
                  </div>
                </div>
                <div className="mt-4">
                  <AddressFields
                    value={billingSameAsShipping ? shipping : billing}
                    onChange={setBilling}
                    errors={errors}
                    prefix="billing"
                    disabled={billingSameAsShipping}
                  />
                </div>
              </div>

              {/* Shipping - real CJ-quoted cost for this cart + destination, not a
                  flat/free client-picked rate. */}
              <div className="rounded-2xl border bg-card p-6">
                <h2 className="text-lg font-bold">Shipping</h2>
                {!shipping.country ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Select a shipping country above to calculate your shipping cost.
                  </p>
                ) : shippingQuoteQuery.isPending ? (
                  <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Calculating shipping…
                  </div>
                ) : shippingQuoteQuery.isError ? (
                  <div className="mt-3 flex items-start gap-2 text-sm text-destructive">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
                    <span>
                      {shippingQuoteQuery.error instanceof ShippingQuoteApiError
                        ? shippingQuoteQuery.error.message
                        : "Couldn't calculate shipping for this address."}
                    </span>
                  </div>
                ) : shippingQuoteQuery.data ? (
                  <div className="mt-3 flex items-center justify-between rounded-xl border-2 border-primary bg-primary-soft px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Truck className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm font-semibold">{shippingQuoteQuery.data.carrierLabel}</p>
                        <p className="text-xs text-muted-foreground">Shipped directly from our supplier</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold">
                      {displayPrice(shippingQuoteQuery.data.shippingCost)}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Order summary */}
            <div className="h-fit space-y-4">
              <div className="rounded-2xl border bg-card p-6">
                <h2 className="text-lg font-bold">Order Summary</h2>
                <ul className="mt-4 space-y-3">
                  {cartItems.map((item) => (
                    <li key={item.id} className="flex items-center gap-3 text-sm">
                      <div className="relative h-12 w-12 flex-none overflow-hidden rounded-lg bg-muted">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                        <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-foreground text-[9px] font-bold text-background">
                          {item.quantity}
                        </span>
                      </div>
                      <span className="line-clamp-2 flex-1">{item.name}</span>
                      <span className="font-semibold">
                        {displayPrice(item.price * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Coupon placeholder - not functional yet */}
                <div className="mt-5 flex gap-2 border-t pt-4">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={coupon}
                      onChange={(e) => setCoupon(e.target.value)}
                      placeholder="Coupon code"
                      className="pl-9"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      toast.info("Coupons aren't available yet", {
                        description: "Check back soon!",
                      })
                    }
                  >
                    Apply
                  </Button>
                </div>

                <div className="mt-4 space-y-2 border-t pt-4 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-semibold text-foreground">{displayPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Shipping</span>
                    <span className="font-semibold text-foreground">
                      {!shipping.country
                        ? "-"
                        : shippingQuoteQuery.isPending
                          ? "Calculating…"
                          : shippingReady
                            ? displayPrice(shippingCost)
                            : "Unavailable"}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2 text-base font-bold">
                    <span>Total</span>
                    <span>{shippingReady ? displayPrice(total) : "-"}</span>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full rounded-full font-semibold"
                disabled={isPlacingOrder || !shippingReady}
              >
                {checkoutMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Redirecting to payment…
                  </>
                ) : directOrderMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Placing order…
                  </>
                ) : stripeEnabled ? (
                  "Continue to Payment"
                ) : (
                  "Place Order"
                )}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                {stripeEnabled
                  ? "You'll be redirected to Stripe's secure checkout to complete payment."
                  : "Your order will be placed now - we'll follow up separately to arrange payment."}
              </p>
            </div>
          </form>
        )}
      </section>
    </>
  );
}
