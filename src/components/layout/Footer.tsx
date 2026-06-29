import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";
import { toast } from "sonner";

export function Footer() {
  const handleSubscribe = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    toast.success("You're subscribed!", {
      description: "Welcome to the Burney Boyz crew. Check your inbox for 10% off.",
    });
    form.reset();
  };

  return (
    <footer className="mt-20 border-t bg-secondary text-secondary-foreground">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="rounded-xl bg-background p-4 inline-block">
              <Logo className="h-10 w-auto" />
            </div>
            <p className="mt-4 max-w-sm text-sm text-secondary-foreground/75">
              Trending products, delivered. Burney Boyz curates the gear, gadgets, and goods
              everyone's talking about — all in one shop.
            </p>
            <div className="mt-5 flex gap-2">
              {[Facebook, Instagram, Twitter, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="grid h-9 w-9 place-items-center rounded-full bg-white/10 transition hover:bg-primary"
                  aria-label="Social link"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-5">
            <div>
              <h4 className="mb-3 text-sm font-semibold">Shop</h4>
              <ul className="space-y-2 text-sm text-secondary-foreground/75">
                <li><Link to="/shop" className="hover:text-primary">All Products</Link></li>
                <li><Link to="/categories" className="hover:text-primary">Categories</Link></li>
                <li><Link to="/shop" className="hover:text-primary">New Arrivals</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold">Company</h4>
              <ul className="space-y-2 text-sm text-secondary-foreground/75">
                <li><Link to="/about" className="hover:text-primary">About</Link></li>
                <li><Link to="/contact" className="hover:text-primary">Contact</Link></li>
                <li><Link to="/faq" className="hover:text-primary">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold">Support</h4>
              <ul className="space-y-2 text-sm text-secondary-foreground/75">
                <li><Link to="/shipping-returns" className="hover:text-primary">Shipping & Returns</Link></li>
                <li><Link to="/privacy-policy" className="hover:text-primary">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-primary">Terms & Conditions</Link></li>
              </ul>
            </div>
          </div>

          <div className="lg:col-span-3">
            <h4 className="mb-3 text-sm font-semibold">Join the newsletter</h4>
            <p className="mb-4 text-sm text-secondary-foreground/75">
              Drops, deals, and 10% off your first order.
            </p>
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <Input
                type="email"
                required
                placeholder="Your email"
                className="border-white/20 bg-white/10 text-secondary-foreground placeholder:text-secondary-foreground/50"
              />
              <Button type="submit">Join</Button>
            </form>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-secondary-foreground/60 sm:flex-row">
          <p>© {new Date().getFullYear()} Burney Boyz. All rights reserved.</p>
          <p>Designed with care · Trending products, delivered worldwide.</p>
        </div>
      </div>
    </footer>
  );
}
