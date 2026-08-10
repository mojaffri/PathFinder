import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import type { Metadata } from "next";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/site";

export const metadata: Metadata = { title: "Set Up Your Profile", robots: PRIVATE_PAGE_ROBOTS };

export default function OnboardingPage() {
  return <OnboardingFlow />;
}
