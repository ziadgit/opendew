import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import {
  getSpotifyClientId,
  getSpotifyRedirectUri,
  getSpotifyScopes,
} from "@/lib/spotify-config";
import type { SpotifyTokenResponse } from "@/lib/spotify-types";

const SPOTIFY_TIMEOUT_MS = 10000;

export const SPOTIFY_ACCESS_COOKIE = "spotify_access_token";
export const SPOTIFY_REFRESH_COOKIE = "spotify_refresh_token";
export const SPOTIFY_STATE_COOKIE = "spotify_oauth_state";
export const SPOTIFY_VERIFIER_COOKIE = "spotify_pkce_verifier";

function toBase64Url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function buildSpotifyAuthUrl() {
  const state = toBase64Url(randomBytes(16));
  const codeVerifier = toBase64Url(randomBytes(64));
  const codeChallenge = toBase64Url(
    createHash("sha256").update(codeVerifier).digest(),
  );

  const params = new URLSearchParams({
    client_id: getSpotifyClientId(),
    response_type: "code",
    redirect_uri: getSpotifyRedirectUri(),
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    state,
    scope: getSpotifyScopes().join(" "),
  });

  return {
    state,
    codeVerifier,
    url: `https://accounts.spotify.com/authorize?${params.toString()}`,
  };
}

export async function exchangeAuthCodeForTokens(
  code: string,
  codeVerifier: string,
): Promise<SpotifyTokenResponse> {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    signal: AbortSignal.timeout(SPOTIFY_TIMEOUT_MS),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: getSpotifyRedirectUri(),
      client_id: getSpotifyClientId(),
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Spotify token exchange failed: ${details}`);
  }

  return (await response.json()) as SpotifyTokenResponse;
}

export async function refreshSpotifyAccessToken(
  refreshToken: string,
): Promise<SpotifyTokenResponse> {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    signal: AbortSignal.timeout(SPOTIFY_TIMEOUT_MS),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: getSpotifyClientId(),
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Spotify token refresh failed: ${details}`);
  }

  return (await response.json()) as SpotifyTokenResponse;
}

export function attachSpotifyAuthCookies(
  response: NextResponse,
  tokens: SpotifyTokenResponse,
) {
  const secure = process.env.NODE_ENV === "production";

  response.cookies.set(SPOTIFY_ACCESS_COOKIE, tokens.access_token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: tokens.expires_in,
  });

  if (tokens.refresh_token) {
    response.cookies.set(SPOTIFY_REFRESH_COOKIE, tokens.refresh_token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
}

export function clearSpotifyAuthCookies(response: NextResponse) {
  response.cookies.delete(SPOTIFY_ACCESS_COOKIE);
  response.cookies.delete(SPOTIFY_REFRESH_COOKIE);
  response.cookies.delete(SPOTIFY_STATE_COOKIE);
  response.cookies.delete(SPOTIFY_VERIFIER_COOKIE);
}

export function isRefreshTokenRevokedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes("invalid_grant") || message.includes("revoked");
}

export async function getServerSpotifyTokens() {
  const cookieStore = await cookies();
  return {
    accessToken: cookieStore.get(SPOTIFY_ACCESS_COOKIE)?.value,
    refreshToken: cookieStore.get(SPOTIFY_REFRESH_COOKIE)?.value,
  };
}

export function getRequestSpotifyTokens(request: NextRequest) {
  return {
    accessToken: request.cookies.get(SPOTIFY_ACCESS_COOKIE)?.value,
    refreshToken: request.cookies.get(SPOTIFY_REFRESH_COOKIE)?.value,
  };
}
