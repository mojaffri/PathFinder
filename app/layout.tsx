import type { Metadata } from "next";
import { AppProviders } from "@/components/providers/app-providers";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  metadataBase: new URL("https://path-finder-umber.vercel.app"),
  title: {
    default: "PathFinder — Evidence-Driven Career Readiness",
    template: "%s | PathFinder",
  },
  description:
    "Turn resumes, job requirements, projects, and assessments into explainable fit scores, skill evidence, and an adaptive career roadmap.",
  openGraph: {
    title: "PathFinder — Evidence-Driven Career Readiness",
    description: "Explainable job fit, evidence-backed skills, and deterministic career roadmaps in one full-stack platform.",
    type: "website",
    url: "/",
    siteName: "PathFinder",
    images: [{ url: "/pathfinder-logo.png", width: 1254, height: 1254, alt: "PathFinder logo" }],
  },
  twitter: {
    card: "summary",
    title: "PathFinder — Evidence-Driven Career Readiness",
    description: "Explainable job fit, evidence-backed skills, and deterministic career roadmaps.",
    images: ["/pathfinder-logo.png"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning className="h-full antialiased">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=document.cookie.match(/(?:^|; )pathfinder-theme=([^;]*)/);var t=m?decodeURIComponent(m[1]):(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");if(t!=="dark"&&t!=="light")t="light";document.documentElement.setAttribute("data-theme",t);document.documentElement.style.colorScheme=t}catch(e){}})()`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <a href="#main-content" className="fixed left-3 top-3 z-50 -translate-y-20 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform focus:translate-y-0">Skip to main content</a>
        <AppProviders>
          <Navbar />
          <main id="main-content" tabIndex={-1} className="flex-1 outline-none">{children}</main>
          <Footer />
          <Analytics />
        </AppProviders>
      </body>
    </html>
  );
}
