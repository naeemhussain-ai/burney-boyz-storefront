// Landing point for the Header's account icon (exactly "/account", not
// "/account/profile" etc.). Just routes a visitor to the right place -
// customer sign-in if signed out, their account dashboard if signed in.
// Requesting admin access is a completely separate flow, see
// src/routes/adminaccount.tsx.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/account/")({
  head: () => ({ meta: [{ title: "My Account - Burney Boyz" }] }),
  component: AccountLandingPage,
});

function AccountLandingPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    navigate({
      to: isAuthenticated ? "/account/profile" : "/login",
      search: isAuthenticated ? undefined : { redirect: "/account/profile" },
      replace: true,
    });
  }, [isLoading, isAuthenticated, navigate]);

  return (
    <section className="mx-auto max-w-md px-4 py-10 sm:px-6 lg:px-8">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="mt-4 h-64 w-full rounded-2xl" />
    </section>
  );
}
