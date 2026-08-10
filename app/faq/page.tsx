import type { Metadata } from "next";
import Link from "next/link";
import { PublicContent } from "@/components/layout/public-content";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description: "Answers about PathFinder scoring, AI use, profile data, GitHub analysis, demo mode, and account deletion.",
};

const questions = [
  ["Is PathFinder a job board?", "No. It helps students evaluate roles, understand evidence-backed gaps, build a roadmap, and track applications they choose to pursue."],
  ["Does AI calculate my fit score?", "No. AI can structure unformatted resume and job text, but deterministic code calculates fit from validated requirements and evidence."],
  ["What does GitHub sign-in share?", "Authentication identifies your account. Optional GitHub connection can inspect public repositories you choose to analyze; PathFinder does not request private-repository access."],
  ["Is saved-job insight global labor-market research?", "No. Frequency and gap insights are calculated only from jobs saved in your own PathFinder account."],
  ["Can I try it without entering my information?", "Yes. The demo uses clearly labeled seeded data so you can inspect the full product without uploading personal documents."],
  ["Can I delete my data?", "Yes. Account settings provide deletion for the account and its associated profile data. Original resume files are stored privately when storage is configured."],
] as const;

export default function FaqPage() {
  return (
    <PublicContent eyebrow="FAQ" title="Straight answers about the product" intro="PathFinder is designed to make its assumptions and limits visible, especially where personal data and AI are involved.">
      <div className="space-y-4">
        {questions.map(([question, answer]) => (
          <section key={question} className="rounded-xl border border-border bg-surface p-5 sm:p-6">
            <h2 className="!mb-2 !text-base">{question}</h2>
            <p>{answer}</p>
          </section>
        ))}
      </div>
      <p>For implementation details, read <Link href="/how-it-works" className="font-medium text-primary hover:underline">how PathFinder works</Link> or review the project&apos;s public documentation on GitHub.</p>
    </PublicContent>
  );
}
