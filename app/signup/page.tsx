import { Suspense } from "react";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { SignupRedirectReader } from "./redirect-reader";

export default function SignupPage() {
  return (
    <AuthPageShell title="Create your account" description="Free — no credit card, no recruiter friction. Just your email.">
      <Suspense fallback={<SignupForm redirectTo="/onboarding" />}>
        <SignupRedirectReader />
      </Suspense>
    </AuthPageShell>
  );
}
