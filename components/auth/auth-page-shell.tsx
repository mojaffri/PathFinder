import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function AuthPageShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-md items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {isSupabaseConfigured() ? (
            children
          ) : (
            <p className="rounded-md border border-border bg-surface p-4 text-sm text-muted-foreground">
              Authentication isn&apos;t configured in this environment yet. Set <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
              and <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> — see{" "}
              <code className="font-mono">.env.example</code> and <code className="font-mono">docs/database.md</code>.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
