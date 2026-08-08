"use client";

import { useState } from "react";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { ProfileForm, type ProfileFormValues } from "@/components/profile/profile-form";
import { ProfileView } from "@/components/profile/profile-view";

function CreateProfileCard() {
  const { createProfile } = useProfile();
  const [name, setName] = useState("");

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Create your profile</CardTitle>
        <CardDescription>
          Stored locally in this browser. No account or password needed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) createProfile(name.trim());
          }}
          className="flex flex-col gap-4"
        >
          <div>
            <Label htmlFor="create-name" required>
              Your name
            </Label>
            <Input
              id="create-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Priya Patel"
              className="mt-1.5"
              autoFocus
            />
          </div>
          <Button type="submit" disabled={!name.trim()}>
            Create profile
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SignedOutCard({ name }: { name: string }) {
  const { signIn } = useProfile();
  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Welcome back, {name}</CardTitle>
        <CardDescription>You&apos;re signed out. Sign back in to continue.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={() => signIn()}>Sign in</Button>
      </CardContent>
    </Card>
  );
}

export function ProfilePageClient() {
  const { profile, isAuthenticated, isLoading, updateProfile, signOut, deleteProfile } =
    useProfile();
  const [editing, setEditing] = useState(false);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <CreateProfileCard />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <SignedOutCard name={profile.name} />
      </div>
    );
  }

  if (editing) {
    const initialValues: ProfileFormValues = profile;
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="mb-8 text-2xl font-semibold tracking-tight text-foreground">
          Edit profile
        </h1>
        <ProfileForm
          initialValues={initialValues}
          submitLabel="Save changes"
          onCancel={() => setEditing(false)}
          onSubmit={(values) => {
            updateProfile(values);
            setEditing(false);
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
          if (window.confirm("Delete your profile? This cannot be undone.")) {
            deleteProfile();
          }
        }}
      />
    </div>
  );
}
