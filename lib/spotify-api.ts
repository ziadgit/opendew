import type {
  SpotifyAudioFeaturesResponse,
  SpotifyCreatePlaylistResponse,
  SpotifyProfile,
  SpotifyTopArtistsResponse,
  SpotifyTopTracksResponse,
  SpotifyTrack,
} from "@/lib/spotify-types";

const SPOTIFY_API = "https://api.spotify.com/v1";
const SPOTIFY_TIMEOUT_MS = 10000;

async function spotifyFetch<T>(path: string, token: string, init?: RequestInit) {
  const response = await fetch(`${SPOTIFY_API}${path}`, {
    ...init,
    signal: AbortSignal.timeout(SPOTIFY_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Spotify API error (${response.status}) ${path}: ${details}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

export async function getCurrentUserProfile(token: string) {
  return spotifyFetch<SpotifyProfile>("/me", token);
}

export async function getTopTracks(token: string, limit = 30) {
  return spotifyFetch<SpotifyTopTracksResponse>(
    `/me/top/tracks?limit=${limit}&time_range=medium_term`,
    token,
  );
}

export async function getTopArtists(token: string, limit = 20) {
  return spotifyFetch<SpotifyTopArtistsResponse>(
    `/me/top/artists?limit=${limit}&time_range=medium_term`,
    token,
  );
}

export async function getAudioFeatures(token: string, trackIds: string[]) {
  if (trackIds.length === 0) {
    return [];
  }

  const chunks: string[][] = [];
  for (let i = 0; i < trackIds.length; i += 100) {
    chunks.push(trackIds.slice(i, i + 100));
  }

  const all = await Promise.all(
    chunks.map(async (ids) => {
      const params = new URLSearchParams({ ids: ids.join(",") });
      const response = await spotifyFetch<SpotifyAudioFeaturesResponse>(
        `/audio-features?${params.toString()}`,
        token,
      );
      return response.audio_features.filter((f): f is NonNullable<typeof f> => Boolean(f));
    }),
  );

  return all.flat();
}

export async function getRecommendations(
  token: string,
  seedTrackIds: string[],
  seedArtistIds: string[],
  limit = 30,
) {
  const params = new URLSearchParams({ limit: String(limit) });

  const trackSeed = seedTrackIds.slice(0, 3).join(",");
  const artistSeed = seedArtistIds.slice(0, 2).join(",");

  if (trackSeed) {
    params.set("seed_tracks", trackSeed);
  }

  if (artistSeed) {
    params.set("seed_artists", artistSeed);
  }

  if (!trackSeed && !artistSeed) {
    throw new Error("Cannot get recommendations without seeds.");
  }

  const data = await spotifyFetch<{ tracks: SpotifyTrack[] }>(
    `/recommendations?${params.toString()}`,
    token,
  );

  return data.tracks;
}

export async function createPlaylist(
  token: string,
  name: string,
  description: string,
) {
  const safeName = name.trim().slice(0, 100) || "MTN DEW Custom Mix";
  const safeDescription = description.trim().slice(0, 300);

  return spotifyFetch<SpotifyCreatePlaylistResponse>(`/me/playlists`, token, {
    method: "POST",
    body: JSON.stringify({
      name: safeName,
      description: safeDescription,
      public: false,
    }),
  });
}

export async function addTracksToPlaylist(
  token: string,
  playlistId: string,
  trackUris: string[],
) {
  const validUris = trackUris.filter((uri) => uri.startsWith("spotify:track:"));
  const uniqueUris = Array.from(new Set(validUris));
  let added = 0;
  let skipped = 0;

  for (let i = 0; i < uniqueUris.length; i += 100) {
    const chunk = uniqueUris.slice(i, i + 100);

    try {
      await spotifyFetch(`/playlists/${playlistId}/tracks`, token, {
        method: "POST",
        body: JSON.stringify({ uris: chunk }),
      });
      added += chunk.length;
      continue;
    } catch {
      for (const uri of chunk) {
        try {
          await spotifyFetch(`/playlists/${playlistId}/tracks`, token, {
            method: "POST",
            body: JSON.stringify({ uris: [uri] }),
          });
          added += 1;
        } catch {
          skipped += 1;
        }
      }
    }
  }

  return { requested: uniqueUris.length, added, skipped };
}
