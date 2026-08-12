import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart, Menu, Search, ShoppingCart, User, X } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import { fetchSearchSuggestions } from "@/api/shop";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
  { to: "/categories", label: "Categories" },
  { to: "/about", label: "About" },
  { to: "/faq", label: "FAQ" },
  { to: "/contact", label: "Contact" },
] as const;

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestQuery, setSuggestQuery] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const { count, openCart } = useCart();
  const { count: wishlistCount } = useWishlist();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  // Debounced autocomplete - a lightweight dropdown of live matches while
  // typing, independent from the Enter/Search-button full results page.
  useEffect(() => {
    const timer = setTimeout(() => setSuggestQuery(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: suggestions } = useQuery({
    queryKey: ["search-suggestions", suggestQuery],
    queryFn: () => fetchSearchSuggestions(suggestQuery),
    enabled: suggestQuery.length > 1,
  });

  const goToProduct = (slug: string) => {
    navigate({ to: "/shop/$slug", params: { slug } });
    setSearchOpen(false);
    setSuggestionsOpen(false);
    setQuery("");
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate({ to: "/shop", search: q ? { q } : {} });
    setSearchOpen(false);
    setSuggestionsOpen(false);
    setQuery("");
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b border-transparent bg-background/80 backdrop-blur-lg transition-all duration-300",
        scrolled && "border-border shadow-soft",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:h-20 sm:gap-4 sm:px-6 lg:h-24 lg:px-8">
        <Logo className="h-10 w-auto sm:h-14 lg:h-16" />

        <nav className="ml-8 hidden flex-1 items-center gap-0.5 lg:flex">
          {nav.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 hover:bg-primary-soft hover:text-foreground",
                  active ? "bg-primary-soft font-semibold text-foreground" : "text-foreground/70",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-primary-soft sm:h-9 sm:w-9"
            onClick={() => setSearchOpen((s) => !s)}
            aria-label="Toggle search"
          >
            {searchOpen ? <X className="h-4 w-4 sm:h-5 sm:w-5" /> : <Search className="h-4 w-4 sm:h-5 sm:w-5" />}
          </Button>

          {/* /account redirects to /login (signed out) or /account/profile
              (signed in) - see account.index.tsx. Requesting admin access
              lives at the separate /adminaccount route, not here. */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-primary-soft sm:h-9 sm:w-9"
            onClick={() => navigate({ to: "/account" })}
            aria-label="My account"
          >
            <User className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="relative h-8 w-8 rounded-full hover:bg-primary-soft sm:h-9 sm:w-9"
            onClick={() => navigate({ to: "/account/wishlist" })}
            aria-label="Wishlist"
          >
            <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
            {wishlistCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-glow">
                {wishlistCount}
              </span>
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="relative h-8 w-8 rounded-full hover:bg-primary-soft sm:h-9 sm:w-9"
            onClick={openCart}
            aria-label="Open cart"
          >
            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 animate-bounce place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-glow">
                {count}
              </span>
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-primary-soft sm:h-9 sm:w-9 lg:hidden"
            onClick={() => setMobileOpen((s) => !s)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-4 w-4 sm:h-5 sm:w-5" /> : <Menu className="h-4 w-4 sm:h-5 sm:w-5" />}
          </Button>
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="relative border-t bg-background/95 backdrop-blur-lg">
          <form
            onSubmit={submitSearch}
            className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:px-6"
          >
            <Search className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSuggestionsOpen(true);
              }}
              onFocus={() => setSuggestionsOpen(true)}
              placeholder="Search by product name or SKU..."
              className="border-0 shadow-none focus-visible:ring-0"
            />
            <Button type="submit" size="sm" className="rounded-full">
              Search
            </Button>
          </form>

          {suggestionsOpen && suggestions && suggestions.length > 0 && (
            <div className="mx-auto max-w-3xl px-4 pb-3 sm:px-6">
              <ul className="overflow-hidden rounded-2xl border bg-card shadow-soft">
                {suggestions.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => goToProduct(s.slug)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-primary-soft"
                    >
                      <div className="h-10 w-10 flex-none overflow-hidden rounded-lg bg-muted">
                        {s.image && (
                          <img src={s.image} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <span className="min-w-0 flex-1 truncate">{s.name}</span>
                      <span className="flex-none font-semibold">
                        ${(Number(s.myPrice) || 0).toFixed(2)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t bg-background lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col p-3">
            {nav.map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "rounded-xl px-4 py-3 text-sm font-medium transition hover:bg-primary-soft",
                    active && "bg-primary-soft font-semibold",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
