import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { KeyRound, Loader2, Mail } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { updateProfile, changePassword, AuthApiError } from "@/api/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/account/profile")({
  head: () => ({ meta: [{ title: "Profile - My Account - Burney Boyz" }] }),
  component: ProfilePage,
});

const profileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

function ProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setFirstName(user?.firstName ?? "");
    setLastName(user?.lastName ?? "");
    setPhone(user?.phone ?? "");
  }, [user]);

  const profileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updated) => {
      queryClient.setQueryData(["auth", "me"], updated);
      toast.success("Profile updated");
    },
    onError: (err) => {
      toast.error(err instanceof AuthApiError ? err.message : "Couldn't update your profile.");
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = profileSchema.safeParse({ firstName, lastName, phone });
    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) errs[issue.path.join(".")] = issue.message;
      setProfileErrors(errs);
      return;
    }
    setProfileErrors({});
    profileMutation.mutate(result.data);
  };

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  const passwordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      toast.success("Password changed");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err) => {
      toast.error(err instanceof AuthApiError ? err.message : "Couldn't change your password.");
    },
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = passwordSchema.safeParse({ currentPassword, newPassword, confirmPassword });
    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) errs[issue.path.join(".")] = issue.message;
      setPasswordErrors(errs);
      return;
    }
    setPasswordErrors({});
    passwordMutation.mutate(result.data);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-6">
        <h2 className="text-lg font-bold">Profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">Update your personal details.</p>

        <form onSubmit={handleProfileSubmit} className="mt-5 space-y-4">
          <div>
            <Label>Email</Label>
            <div className="relative mt-1.5">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={user?.email ?? ""} disabled className="pl-9" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Your email can't be changed.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1.5"
              />
              {profileErrors.firstName && (
                <p className="mt-1 text-xs text-destructive">{profileErrors.firstName}</p>
              )}
            </div>
            <div>
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1.5"
              />
              {profileErrors.lastName && (
                <p className="mt-1 text-xs text-destructive">{profileErrors.lastName}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1.5"
            />
          </div>

          <Button type="submit" className="rounded-full" disabled={profileMutation.isPending}>
            {profileMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </form>
      </div>

      <div className="rounded-2xl border bg-card p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <KeyRound className="h-4 w-4" /> Change Password
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use a strong password you don't use elsewhere.
        </p>

        <form onSubmit={handlePasswordSubmit} className="mt-5 space-y-4">
          <div>
            <Label htmlFor="currentPassword">Current password</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1.5"
            />
            {passwordErrors.currentPassword && (
              <p className="mt-1 text-xs text-destructive">{passwordErrors.currentPassword}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1.5"
              />
              {passwordErrors.newPassword && (
                <p className="mt-1 text-xs text-destructive">{passwordErrors.newPassword}</p>
              )}
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1.5"
              />
              {passwordErrors.confirmPassword && (
                <p className="mt-1 text-xs text-destructive">{passwordErrors.confirmPassword}</p>
              )}
            </div>
          </div>

          <Button
            type="submit"
            variant="outline"
            className="rounded-full"
            disabled={passwordMutation.isPending}
          >
            {passwordMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Updating…
              </>
            ) : (
              "Change Password"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
