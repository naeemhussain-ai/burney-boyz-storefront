import { createFileRoute } from "@tanstack/react-router";
import { Wrench, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/maintenance")({
  head: () => ({
    meta: [
      { title: "Under Maintenance - Burney Boyz" },
      {
        name: "description",
        content:
          "Burney Boyz is currently undergoing scheduled maintenance. We'll be back shortly. Thank you for your patience.",
      },
      { property: "og:title", content: "Under Maintenance - Burney Boyz" },
      { property: "og:description", content: "We're performing scheduled maintenance. Back shortly!" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/maintenance" }],
  }),
  component: MaintenancePage,
});

function MaintenancePage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-muted p-4">
            <Wrench className="h-10 w-10 text-muted-foreground" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-foreground">Under Maintenance</h1>

        <p className="mt-4 text-base text-muted-foreground">
          We're currently performing scheduled maintenance to improve your experience.
          The site will be back online shortly.
        </p>

        <div className="mt-8 flex justify-center gap-3">
          <Button asChild variant="default">
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Link>
          </Button>
          <Button asChild variant="outline">
            <a href="/" onClick={(e) => { e.preventDefault(); window.location.reload(); }}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </a>
          </Button>
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          Need help? Contact us at{" "}
          <a href="mailto:support@burneyboyz.com" className="text-primary hover:underline">
            support@burneyboyz.com
          </a>
        </p>
      </div>
    </div>
  );
}
