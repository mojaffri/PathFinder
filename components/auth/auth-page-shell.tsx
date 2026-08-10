import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function AuthPageShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-md items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <Image src="/pathfinder-logo.png" alt="" width={48} height={48} className="mb-2 h-12 w-12 rounded-xl" priority />
          <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
        <CardContent>
          {isSupabaseConfigured() ? (
            children
          ) : (
            <div className="rounded-lg border border-border bg-surface p-5" role="status">
              <h2 className="font-semibold text-foreground">Sign-in is temporarily unavailable</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                We&apos;re finishing account access. You can still explore PathFinder&apos;s public career guides in the meantime.
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Link href="/discover" className={buttonVariants({ size: "sm" })}>Explore careers</Link>
                <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>Back to home</Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
