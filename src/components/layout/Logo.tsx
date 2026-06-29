import logoAsset from "@/assets/burney-boyz-logo.jpg.asset.json";
import { Link } from "@tanstack/react-router";

export function Logo({ className = "h-10 w-auto" }: { className?: string }) {
  return (
    <Link to="/" className="flex items-center" aria-label="Burney Boyz home">
      <img src={logoAsset.url} alt="Burney Boyz" className={className} />
    </Link>
  );
}
