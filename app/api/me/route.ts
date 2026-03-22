import { NextRequest, NextResponse } from "next/server";

import {
  attachSpotifyAuthCookies,
  clearSpotifyAuthCookies,
  getRequestSpotifyTokens,
  isRefreshTokenRevokedError,
  refreshSpotifyAccessToken,
} from "@/lib/spotify-auth";
import { getCurrentUserProfile } from "@/lib/spotify-api";

async function fetchProfileWithRefresh(request: NextRequest) {
  const { accessToken, refreshToken } = getRequestSpotifyTokens(request);

  if (!accessToken) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  try {
    const profile = await getCurrentUserProfile(accessToken);
    return NextResponse.json({ authenticated: true, profile });
  } catch {
    if (!refreshToken) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    try {
      const tokens = await refreshSpotifyAccessToken(refreshToken);
      const profile = await getCurrentUserProfile(tokens.access_token);
      const response = NextResponse.json({ authenticated: true, profile });
      attachSpotifyAuthCookies(response, {
        ...tokens,
        refresh_token: tokens.refresh_token ?? refreshToken,
      });
      return response;
    } catch (refreshError) {
      if (isRefreshTokenRevokedError(refreshError)) {
        const response = NextResponse.json({ authenticated: false }, { status: 401 });
        clearSpotifyAuthCookies(response);
        return response;
      }

      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
  }
}

export async function GET(request: NextRequest) {
  return fetchProfileWithRefresh(request);
}
