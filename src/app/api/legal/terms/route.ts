import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** Returns the repository-owned terms document without exposing arbitrary paths. */
export async function GET() {
  try {
    const terms = await readFile(join(process.cwd(), "TERMS_AND_CONDITIONS.md"), "utf8");
    return new Response(terms, {
      headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ message: "Terms and conditions are unavailable." }, { status: 500 });
  }
}
