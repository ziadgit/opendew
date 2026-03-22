import { NextResponse } from "next/server";

import {
  buildSpotifyAuthUrl,
  SPOTIFY_STATE_COOKIE,
  SPOTIFY_VERIFIER_COOKIE,
} from "@/lib/spotify-auth";
import { getSpotifyClientId, getSpotifyRedirectUri } from "@/lib/spotify-config";

export async function GET(request: Request) {
  const { codeVerifier, state, url } = buildSpotifyAuthUrl();

  const requestUrl = new URL(request.url);
  if (requestUrl.searchParams.get("debug") === "1") {
    return NextResponse.json({
      clientId: getSpotifyClientId(),
      redirectUri: getSpotifyRedirectUri(),
      authorizeUrl: url,
    });
  }

  const response = NextResponse.redirect(url);
  const secure = process.env.NODE_ENV === "production";

  response.cookies.set(SPOTIFY_STATE_COOKIE, state, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  response.cookies.set(SPOTIFY_VERIFIER_COOKIE, codeVerifier, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}
