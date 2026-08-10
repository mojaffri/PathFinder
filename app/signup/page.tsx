import { Suspense } from "react";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { SignupRedirectReader } from "./redirect-reader";
import type { Metadata } from "next";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/site";

export const metadata: Metadata = { title: "Create an Account", robots: PRIVATE_PAGE_ROBOTS };

export default function SignupPage() {
  return (
    <AuthPageShell title="Create your account">
      <Suspense fallback={<SignupForm redirectTo="/onboarding" />}>
        <SignupRedirectReader />
      </Suspense>
    </AuthPageShell>
  );
}
