import { NextResponse } from "next/server";

import {
  SPOTIFY_ACCESS_COOKIE,
  SPOTIFY_REFRESH_COOKIE,
} from "@/lib/spotify-auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SPOTIFY_ACCESS_COOKIE);
  response.cookies.delete(SPOTIFY_REFRESH_COOKIE);
  return response;
}
