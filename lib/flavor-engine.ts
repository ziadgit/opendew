import type {
  GeneratedFlavor,
  SommelierMusicProfile,
  SommelierWineProfile,
  SpotifyArtist,
  SpotifyAudioFeature,
  SpotifyTrack,
} from "@/lib/spotify-types";

const SOMMELIER_METHOD =
  "Cross-domain mapping adapted from Hyperspell SommeliAgent (music signals translated to wine dimensions).";

type Archetype = [number, number, number, number, number, number];

const GENRE_ARCHETYPES: Record<string, Archetype> = {
  edm: [0.6, 0.8, 0.8, 0.1, 0.65, 0.2],
  house: [0.6, 0.7, 0.8, 0.1, 0.62, 0.3],
  techno: [0.3, 0.8, 0.7, 0.05, 0.65, 0.4],
  ambient: [0.3, 0.2, 0.2, 0.6, 0.4, 0.6],
  electronic: [0.5, 0.6, 0.6, 0.15, 0.6, 0.5],
  "drum and bass": [0.4, 0.9, 0.6, 0.05, 0.85, 0.4],
  rock: [0.5, 0.7, 0.5, 0.3, 0.6, 0.4],
  "indie rock": [0.4, 0.6, 0.5, 0.4, 0.55, 0.5],
  "art rock": [0.3, 0.5, 0.4, 0.4, 0.5, 0.8],
  "post-punk": [0.3, 0.6, 0.5, 0.3, 0.55, 0.6],
  shoegaze: [0.3, 0.5, 0.3, 0.3, 0.5, 0.6],
  "post-rock": [0.3, 0.5, 0.2, 0.4, 0.5, 0.7],
  punk: [0.5, 0.9, 0.4, 0.3, 0.7, 0.2],
  metal: [0.3, 0.9, 0.3, 0.1, 0.7, 0.5],
  alternative: [0.4, 0.6, 0.5, 0.3, 0.55, 0.5],
  grunge: [0.3, 0.7, 0.4, 0.3, 0.55, 0.4],
  jazz: [0.4, 0.4, 0.4, 0.7, 0.55, 0.9],
  classical: [0.4, 0.3, 0.2, 0.9, 0.5, 0.9],
  experimental: [0.3, 0.5, 0.3, 0.4, 0.5, 0.9],
  folk: [0.5, 0.3, 0.4, 0.8, 0.5, 0.4],
  acoustic: [0.5, 0.3, 0.4, 0.9, 0.5, 0.3],
  country: [0.6, 0.5, 0.5, 0.6, 0.55, 0.3],
  pop: [0.7, 0.6, 0.7, 0.2, 0.6, 0.2],
  "indie pop": [0.6, 0.5, 0.6, 0.3, 0.55, 0.3],
  "hip hop": [0.5, 0.6, 0.8, 0.1, 0.55, 0.3],
  rap: [0.5, 0.7, 0.7, 0.1, 0.55, 0.3],
  latin: [0.7, 0.7, 0.8, 0.3, 0.55, 0.3],
  blues: [0.4, 0.5, 0.5, 0.6, 0.5, 0.5],
  soul: [0.5, 0.5, 0.6, 0.5, 0.55, 0.5],
  funk: [0.7, 0.7, 0.8, 0.3, 0.55, 0.5],
};

const DEFAULT_ARCHETYPE: Archetype = [0.5, 0.5, 0.5, 0.5, 0.55, 0.5];

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function weightedAvg(values: Array<[number, number]>): number {
  const numerator = values.reduce((sum, [value, weight]) => sum + clamp01(value) * weight, 0);
  const denom = values.reduce((sum, [, weight]) => sum + weight, 0);
  return denom === 0 ? 0 : clamp01(numerator / denom);
}

function estimateFromGenres(artists: SpotifyArtist[]) {
  const genreWeights: Record<string, number> = {};

  for (const artist of artists) {
    for (const genre of artist.genres ?? []) {
      genreWeights[genre.toLowerCase()] = (genreWeights[genre.toLowerCase()] ?? 0) + 1;
    }
  }

  const entries = Object.entries(genreWeights);
  if (entries.length === 0) {
    const [v, e, d, a, t, c] = DEFAULT_ARCHETYPE;
    return {
      avgValence: v,
      avgEnergy: e,
      avgDanceability: d,
      avgAcousticness: a,
      avgTempo: t * 200,
      avgComplexity: c,
      hasAudioFeatures: false,
    };
  }

  const totalWeight = entries.reduce((sum, [, count]) => sum + count, 0);
  let valence = 0;
  let energy = 0;
  let danceability = 0;
  let acousticness = 0;
  let tempo = 0;
  let complexity = 0;

  for (const [genre, count] of entries) {
    const weight = count / totalWeight;
    let matched = DEFAULT_ARCHETYPE;
    let bestLen = 0;
    for (const [key, values] of Object.entries(GENRE_ARCHETYPES)) {
      if ((genre.includes(key) || key.includes(genre)) && key.length > bestLen) {
        matched = values;
        bestLen = key.length;
      }
    }

    valence += matched[0] * weight;
    energy += matched[1] * weight;
    danceability += matched[2] * weight;
    acousticness += matched[3] * weight;
    tempo += matched[4] * weight;
    complexity += matched[5] * weight;
  }

  return {
    avgValence: valence,
    avgEnergy: energy,
    avgDanceability: danceability,
    avgAcousticness: acousticness,
    avgTempo: tempo * 200,
    avgComplexity: complexity,
    hasAudioFeatures: false,
  };
}

function deriveMood(avgValence: number, avgEnergy: number) {
  if (avgValence > 0.6 && avgEnergy > 0.6) return "euphoric";
  if (avgValence > 0.6 && avgEnergy < 0.4) return "serene";
  if (avgValence < 0.4 && avgEnergy > 0.6) return "intense";
  if (avgValence < 0.4 && avgEnergy < 0.4) return "melancholic";
  if (avgValence > 0.5) return "upbeat";
  if (avgEnergy > 0.5) return "driven";
  return "contemplative";
}

function buildMusicProfile(
  topTracks: SpotifyTrack[],
  topArtists: SpotifyArtist[],
  audioFeatures: SpotifyAudioFeature[],
): SommelierMusicProfile {
  const popularity =
    topTracks.length > 0
      ? topTracks.reduce((sum, track) => sum + track.popularity, 0) / topTracks.length
      : 50;

  const obscurityScore = clamp01(1 - popularity / 100);

  if (audioFeatures.length > 0) {
    const n = audioFeatures.length;
    const avgValence = audioFeatures.reduce((sum, f) => sum + f.valence, 0) / n;
    const avgEnergy = audioFeatures.reduce((sum, f) => sum + f.energy, 0) / n;
    const avgDanceability = audioFeatures.reduce((sum, f) => sum + f.danceability, 0) / n;
    const avgAcousticness = audioFeatures.reduce((sum, f) => sum + f.acousticness, 0) / n;
    const avgTempo = audioFeatures.reduce((sum, f) => sum + f.tempo, 0) / n;
    const avgInstrumentalness =
      audioFeatures.reduce((sum, f) => sum + f.instrumentalness, 0) / n;
    const timeSigVariety =
      clamp01(
        new Set(audioFeatures.map((f) => f.time_signature)).size / 5,
      );
    const avgComplexity =
      avgInstrumentalness * 0.3 + timeSigVariety * 0.3 + (1 - avgDanceability) * 0.4;

    return {
      avgValence: clamp01(avgValence),
      avgEnergy: clamp01(avgEnergy),
      avgDanceability: clamp01(avgDanceability),
      avgAcousticness: clamp01(avgAcousticness),
      avgTempo,
      avgComplexity: clamp01(avgComplexity),
      obscurityScore,
      moodLabel: deriveMood(avgValence, avgEnergy),
      hasAudioFeatures: true,
    };
  }

  const estimated = estimateFromGenres(topArtists);

  return {
    ...estimated,
    obscurityScore,
    moodLabel: deriveMood(estimated.avgValence, estimated.avgEnergy),
  };
}

function genreAffinity(
  topArtists: SpotifyArtist[],
  keywords: string[],
): number {
  const genreWeights = new Map<string, number>();
  let total = 0;

  for (const artist of topArtists) {
    for (const genre of artist.genres ?? []) {
      const normalized = genre.toLowerCase();
      genreWeights.set(normalized, (genreWeights.get(normalized) ?? 0) + 1);
      total += 1;
    }
  }

  if (total === 0) return 0;

  let score = 0;
  for (const [genre, weight] of genreWeights.entries()) {
    for (const keyword of keywords) {
      if (genre.includes(keyword) || keyword.includes(genre)) {
        score += weight / total;
        break;
      }
    }
  }

  return clamp01(score);
}

function musicToWineProfile(
  music: SommelierMusicProfile,
  topArtists: SpotifyArtist[],
): SommelierWineProfile {
  const tempoNorm = music.avgTempo > 0 ? clamp01((music.avgTempo - 60) / 120) : 0.5;

  const dark = genreAffinity(topArtists, [
    "metal",
    "punk",
    "goth",
    "dark",
    "doom",
    "grunge",
    "post-punk",
  ]);
  const complex = genreAffinity(topArtists, [
    "jazz",
    "classical",
    "prog",
    "experimental",
    "avant",
    "art rock",
  ]);
  const acoustic = genreAffinity(topArtists, [
    "folk",
    "acoustic",
    "singer-songwriter",
    "bluegrass",
    "americana",
  ]);
  const electronic = genreAffinity(topArtists, [
    "edm",
    "house",
    "techno",
    "electronic",
    "synth",
  ]);
  const bright = genreAffinity(topArtists, [
    "pop",
    "indie pop",
    "dance",
    "disco",
    "funk",
    "latin",
  ]);
  const earthy = genreAffinity(topArtists, [
    "blues",
    "delta",
    "soul",
    "gospel",
    "country",
    "roots",
    "afrobeat",
  ]);

  return {
    body: weightedAvg([
      [music.avgEnergy, 0.4],
      [tempoNorm, 0.2],
      [1 - music.avgAcousticness, 0.15],
      [dark, 0.15],
      [electronic, 0.1],
    ]),
    sweetness: weightedAvg([
      [music.avgValence, 0.4],
      [music.avgDanceability, 0.2],
      [1 - music.avgComplexity, 0.1],
      [bright, 0.2],
      [1 - dark, 0.1],
    ]),
    tannin: weightedAvg([
      [1 - music.avgValence, 0.3],
      [music.avgComplexity, 0.2],
      [music.avgEnergy, 0.2],
      [dark, 0.2],
      [complex, 0.1],
    ]),
    acidity: weightedAvg([
      [music.avgComplexity, 0.3],
      [1 - music.avgValence, 0.2],
      [music.obscurityScore, 0.2],
      [complex, 0.2],
      [acoustic, 0.1],
    ]),
    complexity: weightedAvg([
      [music.avgComplexity, 0.3],
      [music.obscurityScore, 0.2],
      [1 - music.avgDanceability, 0.1],
      [complex, 0.3],
      [earthy, 0.1],
    ]),
    fruitiness: weightedAvg([
      [music.avgValence, 0.3],
      [music.avgEnergy, 0.2],
      [1 - music.avgComplexity, 0.1],
      [bright, 0.25],
      [1 - dark, 0.15],
    ]),
    earthiness: weightedAvg([
      [music.avgAcousticness, 0.3],
      [music.avgComplexity, 0.2],
      [music.obscurityScore, 0.2],
      [acoustic, 0.15],
      [earthy, 0.15],
    ]),
    spiciness: weightedAvg([
      [music.avgEnergy, 0.3],
      [1 - music.avgValence, 0.2],
      [music.avgComplexity, 0.2],
      [dark, 0.15],
      [electronic, 0.15],
    ]),
  };
}

function pickFlavorStyle(wine: SommelierWineProfile) {
  if (wine.body > 0.68 && wine.spiciness > 0.58) {
    return {
      prefix: ["Voltage", "Turbo", "Ember", "Forge"],
      middle: ["Citrus", "Zest", "Inferno", "Spark"],
      suffix: ["Surge", "Reserve", "Pulse", "Blend"],
      tags: ["bold", "high-intensity", "spiced"],
      notes: ["charged citrus", "dark spice", "high-voltage finish"],
    };
  }
  if (wine.earthiness > 0.58 && wine.complexity > 0.6) {
    return {
      prefix: ["Canyon", "Wild", "Sierra", "Cellar"],
      middle: ["Herbal", "Citrus", "Amber", "Grove"],
      suffix: ["Reserve", "Cask", "Blend", "Harvest"],
      tags: ["earthy", "complex", "old-world"],
      notes: ["citrus rind", "botanical depth", "structured sparkling close"],
    };
  }
  if (wine.fruitiness > 0.62 && wine.sweetness > 0.55) {
    return {
      prefix: ["Sunburst", "Radiant", "Golden", "Daybreak"],
      middle: ["Lime", "Tropic", "Melon", "Citrus"],
      suffix: ["Splash", "Glow", "Pop", "Edition"],
      tags: ["bright", "fruit-forward", "playful"],
      notes: ["ripe lime", "juicy tropical core", "effervescent finish"],
    };
  }

  return {
    prefix: ["Night", "Prism", "Velvet", "Nova"],
    middle: ["Citrus", "Berry", "Smoke", "Drift"],
    suffix: ["Reserve", "Pulse", "Nectar", "Edition"],
    tags: ["balanced", "layered", "sommelier"],
    notes: ["deep citrus", "layered mid-palate", "smooth sparkling close"],
  };
}

function hashSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pick(words: string[], seed: number, offset: number): string {
  return words[(seed + offset) % words.length];
}

export function generateFlavor(
  topTracks: SpotifyTrack[],
  topArtists: SpotifyArtist[],
  audioFeatures: SpotifyAudioFeature[],
  pairingContext?: string,
): GeneratedFlavor {
  const musicProfile = buildMusicProfile(topTracks, topArtists, audioFeatures);
  const wineProfile = musicToWineProfile(musicProfile, topArtists);
  const style = pickFlavorStyle(wineProfile);

  const normalizedContext = (pairingContext ?? "").toLowerCase();
  const pairingHint =
    normalizedContext.includes("spicy") || normalizedContext.includes("fried chicken")
      ? "Pairing signal: off-dry Riesling or chilled Lambrusco energy"
      : normalizedContext.includes("steak")
        ? "Pairing signal: Malbec or Syrah structure"
        : normalizedContext.includes("sushi")
          ? "Pairing signal: dry Riesling or Champagne precision"
          : normalizedContext.includes("pizza")
            ? "Pairing signal: Chianti or Barbera brightness"
            : normalizedContext
              ? `Pairing signal: ${pairingContext?.trim()}`
              : "";

  const identity = [
    ...topTracks.slice(0, 3).map((t) => t.name),
    ...topArtists.slice(0, 2).map((a) => a.name),
    musicProfile.moodLabel,
  ].join("|");

  const seed = hashSeed(identity || "opendew");
  const flavorName = `MTN DEW ${pick(style.prefix, seed, 1)} ${pick(
    style.middle,
    seed,
    2,
  )} ${pick(style.suffix, seed, 3)}`;

  const tastingNotes = `SommeliAgent profile: ${style.notes[0]}, ${style.notes[1]}, and a ${style.notes[2]}. Mood signature: ${musicProfile.moodLabel}.${pairingHint ? ` ${pairingHint}.` : ""}`;

  return {
    flavorName,
    tastingNotes,
    vibeTags: style.tags,
    seedTrackUris: topTracks.slice(0, 12).map((track) => track.uri),
    musicProfile,
    wineProfile,
    sommelierMethod: SOMMELIER_METHOD,
  };
}
