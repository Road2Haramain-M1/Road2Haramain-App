import { readFile } from "node:fs/promises";
import path from "node:path";
import logos from "../../../../../agency_info/umrah_logo_assets.json";

export const runtime = "nodejs";
const approvedNames = new Set(logos.map(logo => logo.logoUrl.split("/").pop()));

/** Serve only selected agency PNGs while retaining the existing public image URLs.
 * Scripts, directory JSON, and arbitrary filesystem paths are never exposed.
 * Unknown names and unavailable images return a safe 404 for the tile fallback.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  if (!/^pjh-\d+\.png$/.test(filename) || !approvedNames.has(filename)) {
    return new Response("Image not found", { status: 404 });
  }
  try {
    const image = await readFile(path.join(process.cwd(), "agency_info", "images", filename));
    return new Response(new Uint8Array(image), { headers: {
      "Content-Type": "image/png", "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch {
    return new Response("Image not found", { status: 404 });
  }
}
