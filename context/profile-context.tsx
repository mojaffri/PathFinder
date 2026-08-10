"use client";

import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import * as profileService from "@/services/profile-service";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { StudentProfile } from "@/types";

export interface ProfileContextValue {
  profile: StudentProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  createProfile: (name: string) => Promise<StudentProfile>;
  updateProfile: (updates: Partial<Omit<StudentProfile, "id" | "createdAt">>) => Promise<StudentProfile | null>;
  completeOnboarding: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Deletes the profile row and everything under it, but keeps the account signed in (they can go through onboarding again). */
  deleteProfile: () => Promise<void>;
  /** Irreversible — deletes the Supabase account itself, cascading through every table via FK. */
  deleteAccount: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setProfile(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setIsAuthenticated(user !== null);
    if (user) {
      const current = await profileService.getProfile().catch(() => null);
      setProfile(current);
    } else {
      setProfile(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProfile();

    if (!isSupabaseConfigured()) return;
    const supabase = createSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadProfile();
    });
    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const createProfile = useCallback(async (name: string) => {
    const created = await profileService.createProfile(name);
    setProfile(created);
    return created;
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Omit<StudentProfile, "id" | "createdAt">>) => {
    const updated = await profileService.updateProfile(updates);
    if (updated) setProfile(updated);
    return updated;
  }, []);

  const completeOnboarding = useCallback(async () => {
    const updated = await profileService.completeOnboarding();
    setProfile(updated);
  }, []);

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured()) {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
    }
    setProfile(null);
    setIsAuthenticated(false);
  }, []);

  const deleteProfile = useCallback(async () => {
    await profileService.deleteProfile();
    setProfile(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    await profileService.deleteAccount();
    if (isSupabaseConfigured()) {
      await createSupabaseBrowserClient().auth.signOut();
    }
    setProfile(null);
    setIsAuthenticated(false);
  }, []);

  const value = useMemo(
    () => ({
      profile,
      isAuthenticated,
      isLoading,
      createProfile,
      updateProfile,
      completeOnboarding,
      signOut,
      deleteProfile,
      deleteAccount,
      refreshProfile: loadProfile,
    }),
    [
      profile,
      isAuthenticated,
      isLoading,
      createProfile,
      updateProfile,
      completeOnboarding,
      signOut,
      deleteProfile,
      deleteAccount,
      loadProfile,
    ],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}
