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

export type SpotifyAudioFeature = {
  id: string;
  valence: number;
  energy: number;
  danceability: number;
  acousticness: number;
  tempo: number;
  instrumentalness: number;
  time_signature: number;
};

export type SpotifyAudioFeaturesResponse = {
  audio_features: Array<SpotifyAudioFeature | null>;
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

export type SommelierMusicProfile = {
  avgValence: number;
  avgEnergy: number;
  avgDanceability: number;
  avgAcousticness: number;
  avgTempo: number;
  avgComplexity: number;
  obscurityScore: number;
  moodLabel: string;
  hasAudioFeatures: boolean;
};

export type SommelierWineProfile = {
  body: number;
  sweetness: number;
  tannin: number;
  acidity: number;
  complexity: number;
  fruitiness: number;
  earthiness: number;
  spiciness: number;
};

export type GeneratedFlavor = {
  flavorName: string;
  tastingNotes: string;
  vibeTags: string[];
  seedTrackUris: string[];
  musicProfile: SommelierMusicProfile;
  wineProfile: SommelierWineProfile;
  sommelierMethod: string;
};
