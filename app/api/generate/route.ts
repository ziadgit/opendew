import { NextRequest, NextResponse } from "next/server";

import { generateFlavor } from "@/lib/flavor-engine";
import {
  attachSpotifyAuthCookies,
  getRequestSpotifyTokens,
  refreshSpotifyAccessToken,
} from "@/lib/spotify-auth";
import { getRecommendations, getTopArtists, getTopTracks } from "@/lib/spotify-api";

async function createGeneration(accessToken: string) {
  const [topTracksData, topArtistsData] = await Promise.all([
    getTopTracks(accessToken, 30),
    getTopArtists(accessToken, 20),
  ]);

  const topTracks = topTracksData.items;
  const topArtists = topArtistsData.items;
  const flavor = generateFlavor(topTracks, topArtists);

  const recommendationTracks = await getRecommendations(
    accessToken,
    topTracks.map((track) => track.id),
    topArtists.map((artist) => artist.id),
    30,
  );

  const merged = [...topTracks, ...recommendationTracks];
  const seen = new Set<string>();
  const selectedTracks = merged.filter((track) => {
    if (seen.has(track.uri)) {
      return false;
    }
    seen.add(track.uri);
    return true;
  });

  return {
    flavorName: flavor.flavorName,
    tastingNotes: flavor.tastingNotes,
    vibeTags: flavor.vibeTags,
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

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const payload = await createGeneration(accessToken);
    return NextResponse.json(payload);
  } catch {
    if (!refreshToken) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    try {
      const tokens = await refreshSpotifyAccessToken(refreshToken);
      const payload = await createGeneration(tokens.access_token);
      const response = NextResponse.json(payload);
      attachSpotifyAuthCookies(response, {
        ...tokens,
        refresh_token: tokens.refresh_token ?? refreshToken,
      });
      return response;
    } catch {
      return NextResponse.json(
        { error: "Could not generate flavor from Spotify profile" },
        { status: 500 },
      );
    }
  }
}
