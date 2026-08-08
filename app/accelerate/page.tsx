import type { Metadata } from "next";
import { AccelerateFlow } from "@/components/accelerate/accelerate-flow";

export const metadata: Metadata = { title: "Accelerate — PathFinder" };

export default async function AcceleratePage({
  searchParams,
}: {
  searchParams: Promise<{ career?: string }>;
}) {
  const { career } = await searchParams;
  return <AccelerateFlow initialCareer={career} />;
}
