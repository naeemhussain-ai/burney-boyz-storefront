import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Facebook, Instagram, Twitter, Youtube, Mail, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";

const shopLinks = [
  { to: "/shop", label: "All Products" },
  { to: "/categories", label: "Categories" },
  { to: "/shop", label: "New Arrivals" },
  { to: "/shop", label: "Trending Now" },
];

const companyLinks = [
  { to: "/about", label: "About Us" },
  { to: "/contact", label: "Contact" },
  { to: "/faq", label: "FAQ" },
];

const supportLinks = [
  { to: "/shipping-returns", label: "Shipping & Returns" },
  { to: "/privacy-policy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms & Conditions" },
];

const socials = [
  { Icon: Facebook, label: "Facebook" },
  { Icon: Instagram, label: "Instagram" },
  { Icon: Twitter, label: "Twitter / X" },
  { Icon: Youtube, label: "YouTube" },
];

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
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12">

          {/* Brand column */}
          <div className="lg:col-span-4">
            <div className="inline-block rounded-2xl bg-white px-4 py-3">
              <Logo className="h-16 w-auto" />
            </div>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-secondary-foreground/70">
              Trending products, delivered worldwide. Burney Boyz curates the gear, gadgets,
              and goods everyone's talking about — all in one shop you can trust.
            </p>

            {/* Contact info */}
            <ul className="mt-5 space-y-2 text-sm text-secondary-foreground/70">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 flex-shrink-0 text-primary" />
                support@burneyboyz.com
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 flex-shrink-0 text-primary" />
                +1 (800) 555-0199
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 flex-shrink-0 text-primary" />
                Los Angeles, CA, USA
              </li>
            </ul>

            {/* Socials */}
            <div className="mt-6 flex gap-2">
              {socials.map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  className="grid h-10 w-10 place-items-center rounded-full bg-white/10 transition hover:bg-primary hover:scale-110"
                  aria-label={label}
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-5">
            <div>
              <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-secondary-foreground/50">
                Shop
              </h4>
              <ul className="space-y-2.5 text-sm">
                {shopLinks.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="text-secondary-foreground/70 transition hover:text-primary">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-secondary-foreground/50">
                Company
              </h4>
              <ul className="space-y-2.5 text-sm">
                {companyLinks.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="text-secondary-foreground/70 transition hover:text-primary">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-secondary-foreground/50">
                Support
              </h4>
              <ul className="space-y-2.5 text-sm">
                {supportLinks.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="text-secondary-foreground/70 transition hover:text-primary">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Newsletter */}
          <div className="lg:col-span-3">
            <h4 className="mb-2 text-sm font-bold uppercase tracking-wider text-secondary-foreground/50">
              Newsletter
            </h4>
            <p className="mb-4 text-sm leading-relaxed text-secondary-foreground/70">
              Get early drops, exclusive deals, and 10% off your first order.
            </p>
            <form onSubmit={handleSubscribe} className="flex flex-col gap-2.5">
              <Input
                type="email"
                required
                placeholder="Your email address"
                className="border-white/20 bg-white/10 text-secondary-foreground placeholder:text-secondary-foreground/40 focus-visible:ring-primary"
              />
              <Button type="submit" className="w-full rounded-xl font-semibold">
                Subscribe
              </Button>
            </form>
            <p className="mt-3 text-xs text-secondary-foreground/40">
              No spam. Unsubscribe anytime.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-secondary-foreground/50 sm:flex-row">
          <p>© {new Date().getFullYear()} Burney Boyz. All rights reserved.</p>
          <p>Made with ♥ · Trending products, delivered worldwide.</p>
        </div>
      </div>
    </footer>
  );
}
