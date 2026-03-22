import type {
  SpotifyCreatePlaylistResponse,
  SpotifyProfile,
  SpotifyTopArtistsResponse,
  SpotifyTopTracksResponse,
  SpotifyTrack,
} from "@/lib/spotify-types";

const SPOTIFY_API = "https://api.spotify.com/v1";

async function spotifyFetch<T>(path: string, token: string, init?: RequestInit) {
  const response = await fetch(`${SPOTIFY_API}${path}`, {
    ...init,
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
  userId: string,
  name: string,
  description: string,
) {
  return spotifyFetch<SpotifyCreatePlaylistResponse>(`/users/${userId}/playlists`, token, {
    method: "POST",
    body: JSON.stringify({
      name,
      description,
      public: false,
    }),
  });
}

export async function addTracksToPlaylist(
  token: string,
  playlistId: string,
  trackUris: string[],
) {
  return spotifyFetch(`/playlists/${playlistId}/tracks`, token, {
    method: "POST",
    body: JSON.stringify({ uris: trackUris.slice(0, 50) }),
  });
}
