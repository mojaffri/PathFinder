import type { Metadata } from "next";
import { ProfilePageClient } from "@/components/profile/profile-page-client";

export const metadata: Metadata = { title: "Your Profile — PathFinder" };

export default function ProfilePage() {
  return <ProfilePageClient />;
}
