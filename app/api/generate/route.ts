import { NextRequest, NextResponse } from "next/server";

import { generateFlavor } from "@/lib/flavor-engine";
import {
  attachSpotifyAuthCookies,
  clearSpotifyAuthCookies,
  getRequestSpotifyTokens,
  isRefreshTokenRevokedError,
  refreshSpotifyAccessToken,
} from "@/lib/spotify-auth";
import {
  getAudioFeatures,
  getRecommendations,
  getTopArtists,
  getTopTracks,
} from "@/lib/spotify-api";

async function createGeneration(accessToken: string, pairingContext?: string) {
  const [topTracksData, topArtistsData] = await Promise.all([
    getTopTracks(accessToken, 30),
    getTopArtists(accessToken, 20),
  ]);

  const topTracks = topTracksData.items;
  const topArtists = topArtistsData.items;
  const audioFeatures = await getAudioFeatures(
    accessToken,
    topTracks.map((track) => track.id),
  ).catch(() => []);

  if (topTracks.length === 0 && topArtists.length === 0) {
    throw new Error(
      "No listening history found yet. Play a few tracks on Spotify, then try again.",
    );
  }

  const flavor = generateFlavor(topTracks, topArtists, audioFeatures, pairingContext);

  const recommendationTracks = await getRecommendations(
    accessToken,
    topTracks.map((track) => track.id),
    topArtists.map((artist) => artist.id),
    30,
  ).catch(() => []);

  const merged = [...topTracks, ...recommendationTracks];
  const seen = new Set<string>();
  const selectedTracks = merged.filter((track) => {
    if (seen.has(track.uri)) {
      return false;
    }
    seen.add(track.uri);
    return true;
  });

  if (selectedTracks.length === 0) {
    throw new Error(
      "We could not build track recommendations from your account yet. Try again after listening a bit more.",
    );
  }

  return {
    flavorName: flavor.flavorName,
    tastingNotes: flavor.tastingNotes,
    vibeTags: flavor.vibeTags,
    sommelierMethod: flavor.sommelierMethod,
    musicProfile: flavor.musicProfile,
    wineProfile: flavor.wineProfile,
    tracks: selectedTracks.slice(0, 30).map((track) => ({
      id: track.id,
      uri: track.uri,
      name: track.name,
      artist: track.artists.map((a) => a.name).join(", "),
      href: track.external_urls.spotify,
      popularity: track.popularity,
    })),
  };
}

export async function POST(request: NextRequest) {
  const { accessToken, refreshToken } = getRequestSpotifyTokens(request);
  const body = (await request.json().catch(() => ({}))) as {
    pairingContext?: string;
  };

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const payload = await createGeneration(accessToken, body.pairingContext);
    return NextResponse.json(payload);
  } catch (firstError) {
    if (!refreshToken) {
      const message =
        firstError instanceof Error ? firstError.message : "Session expired";
      return NextResponse.json({ error: message }, { status: 401 });
    }

    try {
      const tokens = await refreshSpotifyAccessToken(refreshToken);
      const payload = await createGeneration(tokens.access_token, body.pairingContext);
      const response = NextResponse.json(payload);
      attachSpotifyAuthCookies(response, {
        ...tokens,
        refresh_token: tokens.refresh_token ?? refreshToken,
      });
      return response;
    } catch (secondError) {
      if (isRefreshTokenRevokedError(secondError)) {
        const response = NextResponse.json(
          { error: "Spotify session expired. Please reconnect Spotify." },
          { status: 401 },
        );
        clearSpotifyAuthCookies(response);
        return response;
      }

      const message =
        secondError instanceof Error
          ? secondError.message
          : "Could not generate flavor from Spotify profile";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
}
