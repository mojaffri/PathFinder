"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button, buttonVariants, type ButtonProps } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/** Signs the browser in as the shared, clearly-labeled showcase account — no signup required. */
export function TryDemoButton({ variant = "secondary", size = "md", className, ...props }: ButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isSupabaseConfigured()) {
    return (
      <Link href="/discover" className={buttonVariants({ variant, size, className })}>
        Explore careers
      </Link>
    );
  }

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/demo/login", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Demo mode isn't available right now.");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button variant={variant} size={size} className={className} onClick={handleClick} disabled={loading} {...props}>
        <Sparkles className="h-4 w-4" />
        {loading ? "Loading demo..." : "Try the demo"}
      </Button>
      {error && <p className="text-xs text-danger" role="alert">{error}</p>}
    </div>
  );
}
