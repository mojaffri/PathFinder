"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { ConnectGithubButton } from "@/components/github/connect-github-button";
import { importRepo, listMyGithubRepos, lookupPublicRepos } from "@/services/github-service";

type RepoSummary = { name: string; fullName: string; description: string | null; language: string | null };

/** Both paths from the task spec: a public username lookup (no connection needed) and, once connected, "pick from my own repos." */
export function GithubImportPanel({ onImported }: { onImported: () => void }) {
  const [username, setUsername] = useState("");
  const [repos, setRepos] = useState<RepoSummary[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [importingFullName, setImportingFullName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    setError(null);
    if (!username.trim()) return;
    setSearching(true);
    setRepos(null);
    try {
      setRepos(await lookupPublicRepos(username.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't look up that username.");
    } finally {
      setSearching(false);
    }
  }

  async function loadMyRepos() {
    setError(null);
    setSearching(true);
    setRepos(null);
    try {
      setRepos(await listMyGithubRepos());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your repos — make sure GitHub is connected.");
    } finally {
      setSearching(false);
    }
  }

  async function handleImport(fullName: string) {
    setError(null);
    setImportingFullName(fullName);
    try {
      const [owner, repo] = fullName.split("/");
      await importRepo(owner, repo);
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't analyze that repository.");
    } finally {
      setImportingFullName(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analyze a GitHub repository</CardTitle>
        <CardDescription>Look up any public GitHub username, or connect your own account to pick from your repos.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ConnectGithubButton />

        <div className="flex gap-2">
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="GitHub username"
          />
          <Button variant="secondary" onClick={search} disabled={searching}>
            <Search className="mr-1.5 h-4 w-4" />
            Look up
          </Button>
          <Button variant="ghost" onClick={loadMyRepos} disabled={searching}>
            My repos
          </Button>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        {searching && (
          <div className="flex justify-center py-6">
            <Spinner className="h-5 w-5 text-muted-foreground" />
          </div>
        )}

        {repos && repos.length === 0 && !searching && <p className="text-sm text-muted-foreground">No public repositories found.</p>}

        {repos && repos.length > 0 && (
          <ul className="flex flex-col gap-2">
            {repos.map((r) => (
              <li key={r.fullName} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{r.fullName}</p>
                  {r.description && <p className="truncate text-xs text-muted-foreground">{r.description}</p>}
                </div>
                <Button size="sm" onClick={() => handleImport(r.fullName)} disabled={importingFullName !== null}>
                  {importingFullName === r.fullName ? <Spinner className="h-3.5 w-3.5" /> : "Analyze"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
