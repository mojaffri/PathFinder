import { Suspense } from "react";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { LoginForm } from "@/components/auth/login-form";
import { LoginRedirectReader } from "./redirect-reader";
import type { Metadata } from "next";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/site";

export const metadata: Metadata = { title: "Sign In", robots: PRIVATE_PAGE_ROBOTS };

export default function LoginPage() {
  return (
    <AuthPageShell title="Sign in" description="Sign in to save your profile, roadmap, and SkillForge progress.">
      <Suspense fallback={<LoginForm redirectTo="/dashboard" />}>
        <LoginRedirectReader />
      </Suspense>
    </AuthPageShell>
  );
}
