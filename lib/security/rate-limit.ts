import "server-only";
import { NextResponse } from "next/server";
import { consumeRateLimit } from "@/repositories/rate-limit-repository";

export async function enforceRateLimit(userId: string, key: string, limit: number, windowSeconds: number): Promise<NextResponse | null> {
  const result = await consumeRateLimit(userId, key, limit, windowSeconds);
  if (result.allowed) return null;
  return NextResponse.json({ error: "You’re doing that too quickly. Please wait and try again.", retryAfterSeconds: result.retryAfterSeconds }, { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } });
}
