import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Lock } from "lucide-react";
import { resetPassword, AuthApiError } from "@/api/auth";
import { PageHero } from "@/components/layout/PageHero";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const searchSchema = z.object({
  token: z.string().optional(),
});

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password - Burney Boyz" },
      { name: "description", content: "Choose a new password for your Burney Boyz account." },
    ],
    links: [{ rel: "canonical", href: "/reset-password" }],
  }),
  validateSearch: zodValidator(searchSchema),
  component: ResetPasswordPage,
});

const formSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

function ResetPasswordPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: resetPassword,
    onSuccess: () => {
      toast.success("Password reset - please log in with your new password.");
      navigate({ to: "/login" });
    },
    onError: (err) => {
      toast.error(err instanceof AuthApiError ? err.message : "Couldn't reset your password.");
    },
  });

  if (!token) {
    return (
      <>
        <PageHero eyebrow="Account" title="Reset Password" />
        <section className="mx-auto max-w-md px-4 py-10 sm:px-6 lg:px-8">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Missing reset link</AlertTitle>
            <AlertDescription>
              This page needs a reset token. Please use the link from your{" "}
              <Link to="/forgot-password" className="underline">
                password reset email
              </Link>
              .
            </AlertDescription>
          </Alert>
        </section>
      </>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = formSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) errs[issue.path.join(".")] = issue.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    mutation.mutate({ token, password: result.data.password });
  };

  return (
    <>
      <PageHero
        eyebrow="Account"
        title="Reset Password"
        description="Choose a new password for your account."
      />

      <section className="mx-auto max-w-md px-4 py-10 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="rounded-2xl border bg-card p-6 sm:p-8">
          <div className="space-y-5">
            <div>
              <Label htmlFor="password">New password</Label>
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
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-9"
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-destructive">{errors.confirmPassword}</p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full rounded-full font-semibold"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Resetting…
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
          </div>
        </form>
      </section>
    </>
  );
}
