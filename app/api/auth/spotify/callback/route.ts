import { NextRequest, NextResponse } from "next/server";

import { getAppBaseUrl } from "@/lib/spotify-config";
import {
  attachSpotifyAuthCookies,
  exchangeAuthCodeForTokens,
  SPOTIFY_STATE_COOKIE,
  SPOTIFY_VERIFIER_COOKIE,
} from "@/lib/spotify-auth";

function appUrl(path: string) {
  return new URL(path, getAppBaseUrl());
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const returnedState = params.get("state");

  if (!code || !returnedState) {
    return NextResponse.redirect(appUrl("/?error=missing_code"));
  }

  const expectedState = request.cookies.get(SPOTIFY_STATE_COOKIE)?.value;
  const codeVerifier = request.cookies.get(SPOTIFY_VERIFIER_COOKIE)?.value;

  if (!expectedState || returnedState !== expectedState || !codeVerifier) {
    return NextResponse.redirect(appUrl("/?error=invalid_state"));
  }

  try {
    const tokens = await exchangeAuthCodeForTokens(code, codeVerifier);
    const response = NextResponse.redirect(appUrl("/"));
    attachSpotifyAuthCookies(response, tokens);
    response.cookies.delete(SPOTIFY_STATE_COOKIE);
    response.cookies.delete(SPOTIFY_VERIFIER_COOKIE);
    return response;
  } catch {
    return NextResponse.redirect(appUrl("/?error=token_exchange_failed"));
  }
}
