import Link from "next/link";

const links = [
  ["How it works", "/how-it-works"],
  ["FAQ", "/faq"],
  ["Privacy", "/privacy"],
  ["Terms", "/terms"],
] as const;

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 text-sm text-muted-foreground sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p>&copy; {new Date().getFullYear()} PathFinder. Built by Mo Jaffri for students figuring out their next step.</p>
          <p className="mt-1 text-xs">Career guidance is decision support, not a guarantee of employment or credential eligibility.</p>
        </div>
        <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-5 gap-y-2">
          {links.map(([label, href]) => <Link key={href} href={href} className="hover:text-foreground hover:underline">{label}</Link>)}
          <a href="https://github.com/mojaffri/PathFinder" target="_blank" rel="noreferrer" className="hover:text-foreground hover:underline">GitHub<span className="sr-only"> (opens in a new tab)</span></a>
        </nav>
      </div>
    </footer>
  );
}
