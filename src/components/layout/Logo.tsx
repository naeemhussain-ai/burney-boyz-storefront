import { Link } from "@tanstack/react-router";

export function Logo({ className = "h-10 w-auto" }: { className?: string }) {
  return (
    <Link to="/" className="flex items-center" aria-label="Burney Boyz home">
      <img src="/logo.png" alt="Burney Boyz" className={className} />
    </Link>
  );
}
