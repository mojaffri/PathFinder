import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return <div className="mx-auto max-w-xl px-6 py-20 text-center"><p className="text-sm font-medium text-primary">404</p><h1 className="mt-2 text-3xl font-semibold">That path doesn’t lead anywhere</h1><p className="mt-3 text-sm text-muted-foreground">The page may have moved, or the link may be out of date.</p><Link href="/dashboard" className={buttonVariants({ className: "mt-6" })}>Go to dashboard</Link></div>;
}
