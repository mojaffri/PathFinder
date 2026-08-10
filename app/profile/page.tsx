import type { Metadata } from "next";
import { ProfilePageClient } from "@/components/profile/profile-page-client";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/site";

export const metadata: Metadata = { title: "Your Profile", robots: PRIVATE_PAGE_ROBOTS };

export default function ProfilePage() {
  return <ProfilePageClient />;
}
