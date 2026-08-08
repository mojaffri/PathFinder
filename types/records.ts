/**
 * Structured records shared by StudentProfile (manual entry) and resume
 * extraction. Using the same shapes in both places means resume-parsed data
 * and manually-entered data are interchangeable — no separate "resume shape"
 * vs "profile shape" to keep in sync.
 */

import type { GpaScale } from "./profile";

export interface EducationRecord {
  id: string;
  institution: string | null;
  degree: string | null;
  major: string | null;
  gpa: number | null;
  gpaScale: GpaScale | null;
  startDate: string | null;
  endDate: string | null;
}

export function createEmptyEducationRecord(): EducationRecord {
  return {
    id: crypto.randomUUID(),
    institution: null,
    degree: null,
    major: null,
    gpa: null,
    gpaScale: null,
    startDate: null,
    endDate: null,
  };
}

export interface ExperienceRecord {
  id: string;
  title: string | null;
  organization: string | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  summary: string | null;
  bullets: string[];
}

export function createEmptyExperienceRecord(): ExperienceRecord {
  return {
    id: crypto.randomUUID(),
    title: null,
    organization: null,
    location: null,
    startDate: null,
    endDate: null,
    summary: null,
    bullets: [],
  };
}

export interface ProjectRecord {
  id: string;
  title: string;
  technologies: string[];
  date: string | null;
  summary: string | null;
  bullets: string[];
}

export function createEmptyProjectRecord(): ProjectRecord {
  return {
    id: crypto.randomUUID(),
    title: "",
    technologies: [],
    date: null,
    summary: null,
    bullets: [],
  };
}

export interface AwardRecord {
  id: string;
  name: string;
  organization: string | null;
  date: string | null;
  description: string | null;
}

export function createEmptyAwardRecord(): AwardRecord {
  return { id: crypto.randomUUID(), name: "", organization: null, date: null, description: null };
}

export interface CertificationRecord {
  id: string;
  name: string;
  issuer: string | null;
  date: string | null;
}

export function createEmptyCertificationRecord(): CertificationRecord {
  return { id: crypto.randomUUID(), name: "", issuer: null, date: null };
}
