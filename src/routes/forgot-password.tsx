import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { forgotPassword, AuthApiError } from "@/api/auth";
import { PageHero } from "@/components/layout/PageHero";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot Password - Burney Boyz" },
      { name: "description", content: "Reset your Burney Boyz account password." },
    ],
    links: [{ rel: "canonical", href: "/forgot-password" }],
  }),
  component: ForgotPasswordPage,
});

const emailSchema = z.string().trim().email("Please enter a valid email");

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: forgotPassword,
    onSuccess: (result) => {
      toast.success(result.message);
      setDevResetUrl(result.devOnly?.resetUrl ?? null);
    },
    onError: (err) => {
      toast.error(
        err instanceof AuthApiError ? err.message : "Something went wrong. Please try again.",
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Invalid email");
      return;
    }
    setError(null);
    mutation.mutate(result.data);
  };

  return (
    <>
      <PageHero
        eyebrow="Account"
        title="Forgot Password"
        description="Enter your email and we'll send you a link to reset your password."
      />

      <section className="mx-auto max-w-md px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-2xl border bg-card p-6 sm:p-8">
          {mutation.isSuccess ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-primary-soft">
                <CheckCircle2 className="h-7 w-7 text-primary" />
              </div>
              <p className="font-semibold">Check your email</p>
              <p className="text-sm text-muted-foreground">
                If an account exists for{" "}
                <span className="font-medium text-foreground">{email}</span>, we've sent a link to
                reset your password.
              </p>

              {devResetUrl && (
                <div className="mt-3 w-full rounded-xl border border-dashed bg-muted/50 p-3 text-left text-xs">
                  <p className="font-semibold text-foreground">Developer preview</p>
                  <p className="mt-1 text-muted-foreground">
                    No email provider is configured yet, so here's the reset link for testing:
                  </p>
                  <Link to="/reset-password" search={{ token: devResetUrl.split("token=")[1] }}>
                    <span className="mt-1 block break-all font-mono text-primary hover:underline">
                      {devResetUrl}
                    </span>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
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
              {error && <p className="mt-1 text-xs text-destructive">{error}</p>}

              <Button
                type="submit"
                size="lg"
                className="mt-5 w-full rounded-full font-semibold"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Remembered your password?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
