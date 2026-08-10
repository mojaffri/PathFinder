import type { Metadata } from "next";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/site";

export const metadata: Metadata = { title: "Dashboard", robots: PRIVATE_PAGE_ROBOTS };

export default function DashboardPage() {
  return <DashboardView />;
}
