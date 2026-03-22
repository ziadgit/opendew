export type SpotifyTokenResponse = {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
};

export type SpotifyImage = {
  url: string;
  width: number | null;
  height: number | null;
};

export type SpotifyArtist = {
  id: string;
  name: string;
  genres?: string[];
};

export type SpotifyTrack = {
  id: string;
  name: string;
  uri: string;
  popularity: number;
  artists: SpotifyArtist[];
  external_urls: { spotify: string };
};

export type SpotifyTopTracksResponse = {
  items: SpotifyTrack[];
};

export type SpotifyTopArtistsResponse = {
  items: SpotifyArtist[];
};

export type SpotifyProfile = {
  id: string;
  display_name: string;
};

export type SpotifyCreatePlaylistResponse = {
  id: string;
  external_urls: { spotify: string };
};

export type TasteProfile = {
  energy: number;
  positivity: number;
  danceability: number;
  popularity: number;
  acousticness: number;
};

export type GeneratedFlavor = {
  flavorName: string;
  tastingNotes: string;
  vibeTags: string[];
  seedTrackUris: string[];
};
