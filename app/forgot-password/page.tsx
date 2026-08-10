import type { Metadata } from "next";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/site";

export const metadata: Metadata = { title: "Reset Password", robots: PRIVATE_PAGE_ROBOTS };

export default function ForgotPasswordPage() {
  return <AuthPageShell title="Reset your password" description="Enter your email and we’ll send a secure reset link."><ForgotPasswordForm /></AuthPageShell>;
}
