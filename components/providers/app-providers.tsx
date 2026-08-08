"use client";

import { ProfileProvider } from "@/context/profile-context";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <ProfileProvider>{children}</ProfileProvider>;
}
