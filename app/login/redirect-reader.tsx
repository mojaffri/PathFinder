"use client";

import { useSearchParams } from "next/navigation";
import { safeRedirectPath } from "@/lib/security/safe-redirect";
import { LoginForm } from "@/components/auth/login-form";

/** Split out so `useSearchParams()` (needs a Suspense boundary) doesn't force the whole page client-side. */
export function LoginRedirectReader() {
  const searchParams = useSearchParams();
  const redirectTo = safeRedirectPath(searchParams.get("redirectTo"), "/dashboard");
  return <LoginForm redirectTo={redirectTo} />;
}
