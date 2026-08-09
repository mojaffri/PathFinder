"use client";

import { useSearchParams } from "next/navigation";
import { safeRedirectPath } from "@/lib/security/safe-redirect";
import { SignupForm } from "@/components/auth/signup-form";

export function SignupRedirectReader() {
  const searchParams = useSearchParams();
  const redirectTo = safeRedirectPath(searchParams.get("redirectTo"), "/onboarding");
  return <SignupForm redirectTo={redirectTo} />;
}
