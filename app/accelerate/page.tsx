import type { Metadata } from "next";
import { AccelerateFlow } from "@/components/accelerate/accelerate-flow";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/site";

export const metadata: Metadata = { title: "Accelerate", robots: PRIVATE_PAGE_ROBOTS };

export default async function AcceleratePage({
  searchParams,
}: {
  searchParams: Promise<{ career?: string }>;
}) {
  const { career } = await searchParams;
  return <AccelerateFlow initialCareer={career} />;
}
