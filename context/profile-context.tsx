"use client";

import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import * as profileService from "@/services/profile-service";
import type { StudentProfile } from "@/types";

export interface ProfileContextValue {
  profile: StudentProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  createProfile: (name: string) => StudentProfile;
  updateProfile: (
    updates: Partial<Omit<StudentProfile, "id" | "createdAt">>,
  ) => void;
  signIn: () => boolean;
  signOut: () => void;
  deleteProfile: () => void;
}

export const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Reading localStorage during render would cause a server/client hydration
    // mismatch (the server has no localStorage), so we intentionally read it
    // once after mount and gate rendering on `isLoading` instead.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfile(profileService.getProfile());
    setIsAuthenticated(profileService.isSignedIn());
    setIsLoading(false);
  }, []);

  const createProfile = useCallback((name: string) => {
    const created = profileService.createProfile(name);
    setProfile(created);
    setIsAuthenticated(true);
    return created;
  }, []);

  const updateProfile = useCallback(
    (updates: Partial<Omit<StudentProfile, "id" | "createdAt">>) => {
      const updated = profileService.updateProfile(updates);
      if (updated) setProfile(updated);
    },
    [],
  );

  const signIn = useCallback(() => {
    const success = profileService.signIn();
    if (success) setIsAuthenticated(true);
    return success;
  }, []);

  const signOut = useCallback(() => {
    profileService.signOut();
    setIsAuthenticated(false);
  }, []);

  const deleteProfile = useCallback(() => {
    profileService.deleteProfile();
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
      signIn,
      signOut,
      deleteProfile,
    }),
    [profile, isAuthenticated, isLoading, createProfile, updateProfile, signIn, signOut, deleteProfile],
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}
