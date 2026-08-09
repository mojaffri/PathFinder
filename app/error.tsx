"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("PathFinder page error", { digest: error.digest }); }, [error]);
  return <div className="mx-auto max-w-xl px-6 py-20 text-center" role="alert"><h1 className="text-2xl font-semibold">This page hit a problem</h1><p className="mt-3 text-sm text-muted-foreground">Your data is safe. Try loading this view again; if it keeps happening, the error has been recorded for investigation.</p><Button className="mt-6" onClick={reset}>Try again</Button></div>;
}
