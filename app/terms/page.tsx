import type { Metadata } from "next";
import Link from "next/link";
import { PublicContent } from "@/components/layout/public-content";

export const metadata: Metadata = { title: "Terms of Use", description: "The terms and limitations that apply when using PathFinder." };

export default function TermsPage() {
  return (
    <PublicContent eyebrow="Terms" title="Terms of Use" intro="These terms apply to PathFinder, an independent portfolio project maintained by Mo Jaffri. Last updated August 10, 2026.">
      <section><h2>Who may use PathFinder</h2><p>You must be at least 13 years old. You are responsible for keeping your sign-in credentials secure and for the accuracy and lawfulness of information you submit.</p></section>
      <section><h2>Appropriate use</h2><p>Use PathFinder for personal career planning and evaluation. Do not probe or disrupt the service, bypass access controls, upload malicious files, impersonate another person, or submit information you do not have the right to use.</p></section>
      <section><h2>Career guidance is decision support</h2><p>Scores, matches, roadmaps, and feedback are estimates based on available data and documented assumptions. They do not guarantee employment, admission, compensation, credential eligibility, or professional licensure. Verify important requirements with the employer, school, licensing body, or another qualified source.</p></section>
      <section><h2>AI and third-party services</h2><p>Some parsing and feedback may use an external AI provider. Outputs can be incomplete or wrong even when validated for structure. Authentication, hosting, database, analytics, and optional GitHub features also depend on third-party services that may experience interruptions.</p></section>
      <section><h2>Availability and changes</h2><p>PathFinder is provided as a portfolio project without a guaranteed service level. Features may change, and access may be limited to protect users or the service. Material changes to these terms will be reflected by the updated date above.</p></section>
      <section><h2>Privacy and deletion</h2><p>The <Link href="/privacy" className="font-medium text-primary hover:underline">Privacy Notice</Link> explains data handling. You may delete your account and associated data from profile settings.</p></section>
    </PublicContent>
  );
}
