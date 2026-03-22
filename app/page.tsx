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
  tracks: GeneratedTrack[];
};

const buttonBase =
  "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold tracking-wide transition-transform duration-200 hover:-translate-y-0.5";

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState<GeneratedPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playlistUrl, setPlaylistUrl] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const response = await fetch("/api/me", { cache: "no-store" });
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
        setError("Could not verify Spotify session.");
      } finally {
        setAuthChecked(true);
      }
    };

    run();
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

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to generate playlist profile");
      }

      const payload = (await response.json()) as GeneratedPayload;
      setResult(payload);
    } catch {
      setError("Failed to generate from Spotify taste data. Please retry.");
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
        throw new Error("Could not create playlist");
      }

      const payload = (await response.json()) as { url: string };
      setPlaylistUrl(payload.url);
    } catch {
      setError("Could not create playlist on Spotify. Please retry.");
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

          <div className="mt-7 flex flex-wrap items-center gap-3">
            {!profile ? (
              <a
                href="/api/auth/spotify/start"
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
                <a
                  href={playlistUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={`${buttonBase} border border-deep/20 bg-white text-deep hover:bg-deep/5`}
                >
                  Open Playlist
                </a>
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
