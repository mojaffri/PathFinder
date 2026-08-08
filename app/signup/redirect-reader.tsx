"use client";

import { useSearchParams } from "next/navigation";
import { SignupForm } from "@/components/auth/signup-form";

export function SignupRedirectReader() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/onboarding";
  return <SignupForm redirectTo={redirectTo} />;
}
