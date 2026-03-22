"use client";

import { useEffect, useMemo, useState } from "react";

type Profile = {
  id: string;
  display_name: string;
};

type GeneratedTrack = {
  id: string;
  uri: string;
  name: string;
  artist: string;
  href: string;
  popularity: number;
};

type GeneratedPayload = {
  flavorName: string;
  tastingNotes: string;
  vibeTags: string[];
  sommelierMethod: string;
  musicProfile: {
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
  wineProfile: {
    body: number;
    sweetness: number;
    tannin: number;
    acidity: number;
    complexity: number;
    fruitiness: number;
    earthiness: number;
    spiciness: number;
  };
  tracks: GeneratedTrack[];
};

const buttonBase =
  "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold tracking-wide transition-transform duration-200 hover:-translate-y-0.5";

const appBaseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL ?? "http://127.0.0.1:3000";

function withBase(path: string) {
  return new URL(path, appBaseUrl).toString();
}

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState<GeneratedPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playlistUrl, setPlaylistUrl] = useState<string | null>(null);
  const [playlistSummary, setPlaylistSummary] = useState<{
    requested: number;
    added: number;
    skipped: number;
  } | null>(null);
  const [pairingContext, setPairingContext] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);

    const run = async () => {
      try {
        const response = await fetch("/api/me", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          setAuthChecked(true);
          return;
        }

        const data = (await response.json()) as {
          authenticated: boolean;
          profile?: Profile;
        };
        if (data.authenticated && data.profile) {
          setProfile(data.profile);
        }
      } catch {
        setError("Could not verify Spotify session. Try refreshing once.");
      } finally {
        clearTimeout(timeout);
        setAuthChecked(true);
      }
    };

    run();

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  const statusText = useMemo(() => {
    if (!authChecked) {
      return "Checking Spotify session...";
    }
    if (profile) {
      return `Connected as ${profile.display_name}`;
    }
    return "Connect Spotify to generate your custom Dew playlist.";
  }, [authChecked, profile]);

  async function generateFlavorPlaylist() {
    setIsGenerating(true);
    setError(null);
    setResult(null);
    setPlaylistUrl(null);
    setPlaylistSummary(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairingContext }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error ?? "Failed to generate playlist profile");
      }

      const payload = (await response.json()) as GeneratedPayload;
      setResult(payload);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to generate from Spotify taste data. Please retry.";
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  }

  async function createPlaylistOnSpotify() {
    if (!result) {
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/playlist/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: result.flavorName,
          description: result.tastingNotes,
          trackUris: result.tracks.map((track) => track.uri),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error ?? "Could not create playlist");
      }

      const payload = (await response.json()) as {
        url: string;
        trackSummary?: { requested: number; added: number; skipped: number };
      };
      setPlaylistUrl(payload.url);
      setPlaylistSummary(payload.trackSummary ?? null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not create playlist on Spotify. Please retry.";
      setError(message);
      if (message.toLowerCase().includes("reconnect spotify")) {
        setResult(null);
        setProfile(null);
      }
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_10%,#fff8d4_0%,#f4f3ed_36%,#e8efe8_100%)]">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 pb-16 pt-12 sm:px-8 lg:px-10">
        <section className="rounded-3xl border border-black/10 bg-card/90 p-6 shadow-[0_20px_60px_rgba(15,47,44,0.08)] backdrop-blur sm:p-8">
          <p className="mb-4 inline-flex rounded-full bg-citrus px-3 py-1 text-xs font-semibold tracking-[0.18em] text-deep">
            OPENDEW SOMMELIER
          </p>
          <h1 className="display text-4xl leading-tight text-deep sm:text-5xl">
            Turn your Spotify taste into a new Mountain Dew flavor.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-deep/75 sm:text-base">
            We map your listening habits to tasting notes, generate a brand-new flavor
            concept, and create the playlist directly in your Spotify account.
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-deep/70 sm:text-base">
            Powered by the SommeliAgent method from Hyperspell OpenClaw: Spotify audio
            features and genre signals are cross-mapped into wine dimensions (body,
            tannin, acidity, fruitiness, earthiness), then converted into a Dew flavor
            identity and playlist curation profile.
          </p>

          <label className="mt-5 block max-w-3xl">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-deep/65">
              Sommelier Prompt
            </span>
            <textarea
              value={pairingContext}
              onChange={(event) => setPairingContext(event.target.value)}
              rows={4}
              placeholder="Demo: what's the dish, mood, or budget and I'll pair it. Quick hits: spicy fried chicken -> off-dry Riesling or chilled Lambrusco; steak -> Malbec or Syrah; sushi -> dry Riesling or Champagne; pizza -> Chianti or Barbera. What are we matching?"
              className="mt-2 w-full rounded-2xl border border-black/15 bg-white/85 px-4 py-3 text-sm leading-6 text-deep shadow-inner outline-none ring-0 transition focus:border-deep/40"
            />
          </label>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            {!profile ? (
              <a
                href={withBase("/api/auth/spotify/start")}
                className={`${buttonBase} bg-deep text-white hover:bg-deep/90`}
              >
                Connect Spotify
              </a>
            ) : (
              <button
                type="button"
                onClick={generateFlavorPlaylist}
                disabled={isGenerating}
                className={`${buttonBase} bg-sunset text-white hover:bg-sunset/90 disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {isGenerating ? "Analyzing taste..." : "Generate Flavor Playlist"}
              </button>
            )}

            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-deep/65">
              {statusText}
            </span>
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </section>

        {result && (
          <section className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.06)] sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-deep/60">
              Your Flavor
            </p>
            <h2 className="display mt-2 text-3xl text-deep sm:text-4xl">{result.flavorName}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-deep/75 sm:text-base">
              {result.tastingNotes}
            </p>
            <p className="mt-3 max-w-3xl text-xs leading-6 text-deep/65 sm:text-sm">
              {result.sommelierMethod}
            </p>

            <div className="mt-4 grid gap-3 rounded-2xl border border-black/10 bg-white/70 p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-deep/60">
                  Music Profile
                </p>
                <p className="mt-1 text-sm text-deep/80">
                  Mood: <span className="font-semibold">{result.musicProfile.moodLabel}</span>
                </p>
                <p className="text-xs text-deep/65">
                  Energy {Math.round(result.musicProfile.avgEnergy * 100)}% · Valence{" "}
                  {Math.round(result.musicProfile.avgValence * 100)}% · Dance{" "}
                  {Math.round(result.musicProfile.avgDanceability * 100)}%
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-deep/60">
                  Wine Mapping
                </p>
                <p className="text-xs text-deep/65">
                  Body {Math.round(result.wineProfile.body * 100)}% · Tannin{" "}
                  {Math.round(result.wineProfile.tannin * 100)}% · Complexity{" "}
                  {Math.round(result.wineProfile.complexity * 100)}%
                </p>
                <p className="text-xs text-deep/65">
                  Fruitiness {Math.round(result.wineProfile.fruitiness * 100)}% · Earthiness{" "}
                  {Math.round(result.wineProfile.earthiness * 100)}%
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {result.vibeTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-deep/20 bg-deep/5 px-3 py-1 text-xs font-medium text-deep"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={createPlaylistOnSpotify}
                disabled={isCreating}
                className={`${buttonBase} bg-deep text-white hover:bg-deep/90 disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {isCreating ? "Creating playlist..." : "Create Playlist in Spotify"}
              </button>

              {playlistUrl && (
                <>
                  <a
                    href={playlistUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={`${buttonBase} border border-deep/20 bg-white text-deep hover:bg-deep/5`}
                  >
                    Open Playlist
                  </a>
                  {playlistSummary && (
                    <p className="text-xs text-deep/70">
                      Added {playlistSummary.added}/{playlistSummary.requested} tracks
                      {playlistSummary.skipped > 0
                        ? ` (${playlistSummary.skipped} skipped by Spotify)`
                        : ""}
                    </p>
                  )}
                </>
              )}
            </div>

            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {result.tracks.slice(0, 12).map((track) => (
                <li
                  key={track.uri}
                  className="rounded-xl border border-black/10 bg-card/70 px-3 py-2"
                >
                  <a
                    href={track.href}
                    target="_blank"
                    rel="noreferrer"
                    className="block"
                  >
                    <p className="text-sm font-semibold text-deep">{track.name}</p>
                    <p className="text-xs text-deep/60">{track.artist}</p>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
