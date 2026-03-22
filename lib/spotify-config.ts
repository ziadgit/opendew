const DEFAULT_CLIENT_ID = "52c0055d11a749dc9ea31069183eb606";

export function getSpotifyClientId(): string {
  return process.env.SPOTIFY_CLIENT_ID ?? DEFAULT_CLIENT_ID;
}

export function getSpotifyRedirectUri(): string {
  return (
    process.env.SPOTIFY_REDIRECT_URI ??
    "http://127.0.0.1:3000/api/auth/spotify/callback"
  );
}

export function getAppBaseUrl(): string {
  return process.env.APP_BASE_URL ?? "http://127.0.0.1:3000";
}

export function getSpotifyScopes(): string[] {
  return [
    "user-top-read",
    "user-read-private",
    "playlist-modify-public",
    "playlist-modify-private",
  ];
}
