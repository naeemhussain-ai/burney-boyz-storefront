// Dedicated entry point for requesting admin access - kept completely
// separate from the normal customer account flow (/register, /login,
// /account). Only ever a handful of people should land here; the Header's
// account icon does NOT link here - see account.index.tsx for the customer
// flow that icon actually points to.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, Clock, Loader2, Lock, Mail, ShieldAlert, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AuthApiError } from "@/api/auth";
import { PageHero } from "@/components/layout/PageHero";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/adminaccount")({
  head: () => ({ meta: [{ title: "Admin Access - Burney Boyz" }] }),
  component: AdminAccountPage,
});

const registerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  email: z.string().trim().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

function AdminAccountPage() {
  const { user, isAuthenticated, isLoading, registerAdmin } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (isLoading) {
    return (
      <section className="mx-auto max-w-md px-4 py-10 sm:px-6 lg:px-8">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="mt-4 h-64 w-full rounded-2xl" />
      </section>
    );
  }

  // Already logged in - show where their request stands instead of the form.
  if (isAuthenticated && user) {
    if (user.isAdmin) {
      return (
        <>
          <PageHero eyebrow="Admin" title="You have admin access" description="" />
          <section className="mx-auto max-w-md px-4 py-10 text-center sm:px-6 lg:px-8">
            <div className="rounded-2xl border bg-card p-8">
              <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
              <p className="mt-3 text-sm text-muted-foreground">
                Signed in as <strong>{user.email}</strong>.
              </p>
              <Button asChild className="mt-6 rounded-full">
                <Link to="/admin">Go to Admin Panel</Link>
              </Button>
            </div>
          </section>
        </>
      );
    }

    const status = user.adminRequestStatus;
    const { icon: Icon, title, description } =
      status === "pending"
        ? {
            icon: Clock,
            title: "Request pending",
            description: "Your admin access request is awaiting review. You'll get an email once it's decided.",
          }
        : status === "declined"
          ? {
              icon: ShieldAlert,
              title: "Request declined",
              description: "Your admin access request was not approved.",
            }
          : {
              icon: ShieldAlert,
              title: "No admin access",
              description: "This account hasn't requested admin access.",
            };

    return (
      <>
        <PageHero eyebrow="Admin" title={title} description="" />
        <section className="mx-auto max-w-md px-4 py-10 text-center sm:px-6 lg:px-8">
          <div className="rounded-2xl border bg-card p-8">
            <Icon className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">{description}</p>
          </div>
        </section>
      </>
    );
  }

  if (submitted) {
    return (
      <>
        <PageHero
          eyebrow="Admin"
          title="Request sent"
          description="An existing admin has been notified and will review your request."
        />
        <section className="mx-auto max-w-md px-4 py-10 text-center sm:px-6 lg:px-8">
          <div className="rounded-2xl border bg-card p-8">
            <p className="text-sm text-muted-foreground">
              You'll get an email once your admin access is approved or declined. Once approved,
              log in with the same email and password you just used.
            </p>
            <Button asChild className="mt-6 rounded-full">
              <Link to="/">Back to Store</Link>
            </Button>
          </div>
        </section>
      </>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = registerSchema.safeParse({ firstName, lastName, email, password });
    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) errs[issue.path.join(".")] = issue.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    setIsSubmitting(true);

    try {
      await registerAdmin(result.data);
      setSubmitted(true);
    } catch (err) {
      toast.error(
        err instanceof AuthApiError
          ? err.message
          : "Couldn't submit your request. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHero
        eyebrow="Admin"
        title="Request Admin Access"
        description="Submit your details - an existing admin will review and approve or decline your request."
      />

      <section className="mx-auto max-w-md px-4 py-10 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="rounded-2xl border bg-card p-6 sm:p-8">
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="firstName">First name</Label>
                <div className="relative mt-1.5">
                  <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="firstName"
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {errors.firstName && (
                  <p className="mt-1 text-xs text-destructive">{errors.firstName}</p>
                )}
              </div>
              <div>
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1.5"
                />
                {errors.lastName && (
                  <p className="mt-1 text-xs text-destructive">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-destructive">{errors.password}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">At least 8 characters.</p>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full rounded-full font-semibold"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Submitting request…
                </>
              ) : (
                "Request Access"
              )}
            </Button>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already approved?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Log in
            </Link>
          </p>
        </form>
      </section>
    </>
  );
}
