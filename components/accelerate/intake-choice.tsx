import { FileText, PenLine } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function IntakeChoice({
  onChooseResume,
  onChooseManual,
}: {
  onChooseResume: () => void;
  onChooseManual: () => void;
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <FileText className="h-5 w-5" />
          </div>
          <CardTitle className="mt-3">Upload a resume</CardTitle>
          <CardDescription>
            Fastest option. We&apos;ll extract your background and let you review it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onChooseResume}>Upload resume</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-surface text-foreground">
            <PenLine className="h-5 w-5" />
          </div>
          <CardTitle className="mt-3">Enter manually</CardTitle>
          <CardDescription>No resume yet? Answer a short set of questions instead.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="secondary" onClick={onChooseManual}>
            Enter manually
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
