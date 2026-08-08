export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
        <p>&copy; {new Date().getFullYear()} PathFinder. Built for students figuring out their next step.</p>
        <p>Career & academic roadmap engine</p>
      </div>
    </footer>
  );
}
