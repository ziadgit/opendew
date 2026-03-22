import type {
  GeneratedFlavor,
  SpotifyArtist,
  SpotifyTrack,
  TasteProfile,
} from "@/lib/spotify-types";

type GenreWeight = {
  energy?: number;
  positivity?: number;
  danceability?: number;
  acousticness?: number;
};

const genreHints: Record<string, GenreWeight> = {
  rock: { energy: 0.7, positivity: 0.45, danceability: 0.4, acousticness: 0.2 },
  metal: { energy: 0.9, positivity: 0.3, danceability: 0.2, acousticness: 0.1 },
  pop: { energy: 0.65, positivity: 0.75, danceability: 0.7, acousticness: 0.25 },
  dance: { energy: 0.85, positivity: 0.75, danceability: 0.9, acousticness: 0.1 },
  electronic: {
    energy: 0.8,
    positivity: 0.62,
    danceability: 0.82,
    acousticness: 0.12,
  },
  house: { energy: 0.82, positivity: 0.7, danceability: 0.88, acousticness: 0.08 },
  jazz: { energy: 0.4, positivity: 0.54, danceability: 0.45, acousticness: 0.7 },
  ambient: { energy: 0.25, positivity: 0.52, danceability: 0.3, acousticness: 0.8 },
  indie: { energy: 0.52, positivity: 0.6, danceability: 0.55, acousticness: 0.5 },
  folk: { energy: 0.38, positivity: 0.6, danceability: 0.4, acousticness: 0.85 },
  country: { energy: 0.5, positivity: 0.68, danceability: 0.58, acousticness: 0.65 },
  hip: { energy: 0.72, positivity: 0.58, danceability: 0.83, acousticness: 0.18 },
  rap: { energy: 0.74, positivity: 0.5, danceability: 0.84, acousticness: 0.12 },
  rnb: { energy: 0.55, positivity: 0.7, danceability: 0.78, acousticness: 0.28 },
  soul: { energy: 0.48, positivity: 0.74, danceability: 0.62, acousticness: 0.46 },
  classical: {
    energy: 0.2,
    positivity: 0.48,
    danceability: 0.15,
    acousticness: 0.95,
  },
};

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function buildTasteProfile(
  topTracks: SpotifyTrack[],
  topArtists: SpotifyArtist[],
): TasteProfile {
  const popularity =
    topTracks.length > 0
      ? topTracks.reduce((sum, track) => sum + track.popularity, 0) /
        (topTracks.length * 100)
      : 0.5;

  const defaults = {
    energy: 0.56,
    positivity: 0.58,
    danceability: 0.62,
    acousticness: 0.34,
  };

  let weightedEnergy = 0;
  let weightedPositivity = 0;
  let weightedDanceability = 0;
  let weightedAcousticness = 0;
  let total = 0;

  for (const artist of topArtists) {
    const genres = artist.genres ?? [];
    for (const genre of genres) {
      const lowered = genre.toLowerCase();
      const hintKey = Object.keys(genreHints).find((k) => lowered.includes(k));
      if (!hintKey) {
        continue;
      }

      const hint = genreHints[hintKey];
      weightedEnergy += hint.energy ?? defaults.energy;
      weightedPositivity += hint.positivity ?? defaults.positivity;
      weightedDanceability += hint.danceability ?? defaults.danceability;
      weightedAcousticness += hint.acousticness ?? defaults.acousticness;
      total += 1;
    }
  }

  if (total === 0) {
    return {
      ...defaults,
      popularity,
    };
  }

  return {
    energy: clamp(weightedEnergy / total),
    positivity: clamp(weightedPositivity / total),
    danceability: clamp(weightedDanceability / total),
    acousticness: clamp(weightedAcousticness / total),
    popularity: clamp(popularity),
  };
}

function pickStyle(profile: TasteProfile) {
  if (profile.energy > 0.72 && profile.danceability > 0.72) {
    return {
      prefix: ["Voltage", "Neon", "Turbo", "Flash"],
      infix: ["Citrus", "Zing", "Rush", "Spark"],
      suffix: ["Surge", "Reserve", "Pulse", "Edition"],
      notes: ["electric lime", "charged citrus", "sparkling finish"],
      tags: ["high-energy", "dance-heavy", "electro-zest"],
    };
  }

  if (profile.acousticness > 0.6) {
    return {
      prefix: ["Sierra", "Wild", "Canyon", "Suntrail"],
      infix: ["Citrus", "Herbal", "Amber", "Breeze"],
      suffix: ["Blend", "Reserve", "Spritz", "Harvest"],
      notes: ["citrus peel", "soft botanicals", "dry sparkling lift"],
      tags: ["organic", "earthy", "mellow-groove"],
    };
  }

  if (profile.positivity > 0.7) {
    return {
      prefix: ["Sunny", "Radiant", "Golden", "Daybreak"],
      infix: ["Lime", "Melon", "Tropic", "Citrus"],
      suffix: ["Pop", "Reserve", "Splash", "Glow"],
      notes: ["bright lime", "juicy tropical middle", "playful sparkle"],
      tags: ["upbeat", "feel-good", "sunburst"],
    };
  }

  return {
    prefix: ["Velvet", "Night", "Nova", "Prism"],
    infix: ["Citrus", "Berry", "Smoke", "Cask"],
    suffix: ["Reserve", "Drift", "Pulse", "Nectar"],
    notes: ["deep citrus", "cool spice", "smooth sparkling close"],
    tags: ["moody", "bold", "late-night"],
  };
}

function hashSeed(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pickWord(words: string[], seed: number, offset: number) {
  return words[(seed + offset) % words.length];
}

export function generateFlavor(
  topTracks: SpotifyTrack[],
  topArtists: SpotifyArtist[],
): GeneratedFlavor {
  const profile = buildTasteProfile(topTracks, topArtists);
  const style = pickStyle(profile);
  const identityBase = [
    ...topTracks.slice(0, 3).map((track) => track.name),
    ...topArtists.slice(0, 2).map((artist) => artist.name),
  ].join("|");

  const seed = hashSeed(identityBase || "opendew");

  const flavorName = `MTN DEW ${pickWord(style.prefix, seed, 1)} ${pickWord(
    style.infix,
    seed,
    2,
  )} ${pickWord(style.suffix, seed, 3)}`;

  const tastingNotes = `Built from your listening profile: ${style.notes[0]}, ${style.notes[1]}, and a ${style.notes[2]}.`; 

  return {
    flavorName,
    tastingNotes,
    vibeTags: style.tags,
    seedTrackUris: topTracks.slice(0, 12).map((track) => track.uri),
  };
}
