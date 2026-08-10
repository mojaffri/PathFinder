import type { Metadata } from "next";
import Link from "next/link";
import { PublicContent } from "@/components/layout/public-content";

export const metadata: Metadata = { title: "Privacy", description: "How PathFinder collects, uses, protects, and deletes account and career-readiness data." };

export default function PrivacyPage() {
  return (
    <PublicContent eyebrow="Privacy" title="Your career data should stay under your control" intro="This notice explains the data handled by PathFinder, an independent portfolio project maintained by Mo Jaffri. Last updated August 10, 2026.">
      <section><h2>Information PathFinder handles</h2><p>When you create an account, PathFinder may store your email address, profile, education and work history, skills, projects, goals, uploaded resume text and file, saved jobs, assessments, roadmap progress, and application records. The demo account contains seeded data and should not be used for personal information.</p></section>
      <section><h2>How the information is used</h2><p>The information is used to authenticate you, restore your work, analyze job requirements, connect claims to evidence, calculate explainable scores, build roadmaps, and show progress. Saved-job insights describe only jobs in your account—not the labor market as a whole.</p></section>
      <section><h2>Service providers</h2><p>Supabase provides authentication, database, and private file storage. Vercel hosts the application and provides aggregate web analytics. When AI-assisted parsing or feedback is enabled, the minimum text needed for that task may be sent to the configured AI provider. Public GitHub repository data is accessed only when you ask PathFinder to analyze it.</p></section>
      <section><h2>Storage and security</h2><p>Account data is isolated by authenticated user ownership and database row-level security. Resume files are private and delivered through short-lived links. OAuth tokens are server-only and encrypted at rest when token persistence is enabled. No internet service can promise absolute security.</p></section>
      <section><h2>Retention and deletion</h2><p>Data remains available while your account exists. You can delete your account and associated data from your profile settings. If automated deletion is unavailable, do not upload additional information; <a href="https://github.com/mojaffri/PathFinder/security/advisories/new" target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">contact the maintainer privately through GitHub<span className="sr-only"> (opens in a new tab)</span></a> without including resume content or other sensitive documents in the message.</p></section>
      <section><h2>Age</h2><p>PathFinder accounts are for people age 13 or older. The service is not directed to children under 13, and they should not create an account or provide personal information.</p></section>
      <section><h2>Your choices</h2><p>You can use the seeded demo instead of supplying personal information, edit profile data, disconnect optional integrations, or delete the account. Review the <Link href="/terms" className="font-medium text-primary hover:underline">Terms of Use</Link> for product limitations.</p></section>
    </PublicContent>
  );
}
