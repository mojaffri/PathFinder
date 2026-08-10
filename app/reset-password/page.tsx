import type { Metadata } from "next";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/site";

export const metadata: Metadata = { title: "Choose a New Password", robots: PRIVATE_PAGE_ROBOTS };

export default function ResetPasswordPage() {
  return <AuthPageShell title="Choose a new password" description="Use at least 8 characters and avoid a password you use elsewhere."><ResetPasswordForm /></AuthPageShell>;
}
