import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { toast } from "sonner";
import { Loader2, Lock, Mail, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AuthApiError } from "@/api/auth";
import { PageHero } from "@/components/layout/PageHero";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Sign Up - Burney Boyz" },
      { name: "description", content: "Create a Burney Boyz account." },
    ],
    links: [{ rel: "canonical", href: "/register" }],
  }),
  validateSearch: zodValidator(searchSchema),
  component: RegisterPage,
});

const registerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  email: z.string().trim().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      await register(result.data);
      toast.success("Welcome to Burney Boyz!");
      navigate({ to: redirect || "/account/profile" });
    } catch (err) {
      toast.error(
        err instanceof AuthApiError ? err.message : "Couldn't create your account. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHero
        eyebrow="Account"
        title="Create Your Account"
        description="Sign up to track orders, save addresses, and build your wishlist."
      />

      <section className="mx-auto max-w-md px-4 py-10 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="rounded-2xl border bg-card p-6 sm:p-8">
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
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
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating account…
                </>
              ) : (
                "Sign Up"
              )}
            </Button>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Log in
            </Link>
          </p>
        </form>
      </section>
    </>
  );
}
