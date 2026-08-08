"use client";

import { useState } from "react";
import Link from "next/link";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { ProfileForm, type ProfileFormValues } from "@/components/profile/profile-form";
import { ProfileView } from "@/components/profile/profile-view";
import { ResumeHistory } from "@/components/profile/resume-history";
import { ExtractedDataReview } from "@/components/accelerate/extracted-data-review";
import type { ResumeUploadResult } from "@/types";

function SignedOutCard() {
  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Sign in to view your profile</CardTitle>
        <CardDescription>Your profile, roadmap, and SkillForge progress are tied to your account.</CardDescription>
      </CardHeader>
      <CardContent className="flex gap-3">
        <Link href="/login?redirectTo=/profile">
          <Button>Sign in</Button>
        </Link>
        <Link href="/signup?redirectTo=/onboarding">
          <Button variant="secondary">Create an account</Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function NoProfileYetCard() {
  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Let&apos;s set up your profile</CardTitle>
        <CardDescription>A few short steps — education, target career, and how much time you have each week.</CardDescription>
      </CardHeader>
      <CardContent>
        <Link href="/onboarding">
          <Button>Start onboarding</Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export function ProfilePageClient() {
  const { profile, isAuthenticated, isLoading, updateProfile, signOut, deleteAccount } = useProfile();
  const [editing, setEditing] = useState(false);
  const [resumeReview, setResumeReview] = useState<{ resumeData: ResumeUploadResult; initialValues: ProfileFormValues } | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <SignedOutCard />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <NoProfileYetCard />
      </div>
    );
  }

  if (resumeReview) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <ExtractedDataReview
          resumeData={resumeReview.resumeData}
          initialValues={resumeReview.initialValues}
          onCancel={() => setResumeReview(null)}
          onConfirm={(values) => {
            updateProfile(values).then(() => setResumeReview(null));
          }}
        />
      </div>
    );
  }

  if (editing) {
    const initialValues: ProfileFormValues = profile;
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="mb-8 text-2xl font-semibold tracking-tight text-foreground">Edit profile</h1>
        <ProfileForm
          initialValues={initialValues}
          submitLabel="Save changes"
          onCancel={() => setEditing(false)}
          onSubmit={(values) => {
            updateProfile(values).then(() => setEditing(false));
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <ProfileView
        profile={profile}
        onEdit={() => setEditing(true)}
        onSignOut={signOut}
        onDelete={() => {
          if (window.confirm("Permanently delete your account and everything in it? This cannot be undone.")) {
            deleteAccount();
          }
        }}
      />
      <div className="mt-8">
        <ResumeHistory
          profileValues={profile}
          onExtracted={(resumeData, initialValues) => setResumeReview({ resumeData, initialValues })}
        />
      </div>
    </div>
  );
}
