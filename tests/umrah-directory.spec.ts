import { expect, test } from "@playwright/test";
import { umrahAgencyBrands, umrahDirectory, normalizeAgencyName } from "../src/features/pilgrimage/umrah-directory";
import { createUmrahDirectoryCatalogue } from "../src/features/pilgrimage/umrah-directory-catalogue";
import { mockApi } from "../src/lib/api/mock-client";
import { existsSync, readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { GET as getAgencyLogo } from "../src/app/images/agency-logos/[filename]/route";

test("agency image delivery preserves bytes and rejects non-image paths", async () => {
  const response = await getAgencyLogo(new Request("http://localhost/images/agency-logos/pjh-5.png"), {
    params: Promise.resolve({ filename: "pjh-5.png" }),
  });
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("image/png");
  expect(Buffer.from(await response.arrayBuffer())).toEqual(readFileSync("agency_info/images/pjh-5.png"));
  for (const filename of ["../motac_umrah_agencies.json", "collect_agency_logos.py", "pjh-9999.png", "%2e%2e%2f.env.local"]) {
    const result = await getAgencyLogo(new Request("http://localhost/"), { params: Promise.resolve({ filename }) });
    expect(result.status).toBe(404);
    expect(await result.text()).toBe("Image not found");
  }
});

test("API mock selection is explicit, production-safe, and never falls back on errors", async () => {
  const code = ts.transpileModule(readFileSync("src/lib/api/client.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  for (const [environment, flag, expected] of [
    ["development", "true", "mock"], ["development", "false", "real"],
    ["development", undefined, "real"], ["production", "true", "real"],
  ]) {
    const exports: { api?: { agencies: () => Promise<string[]> } } = {};
    runInNewContext(code, { exports, process: { env: { NODE_ENV: environment, NEXT_PUBLIC_LOCAL_UI_MOCK: flag } },
      require: () => ({ mockApi: { agencies: async () => ["mock"] } }),
      fetch: async () => ({ ok: true, json: async () => ["real"] }),
    });
    expect(await exports.api!.agencies()).toEqual([expected]);
  }
  const exports: { api?: { agencies: () => Promise<string[]> } } = {};
  runInNewContext(code, { exports, process: { env: { NODE_ENV: "production" } },
    require: () => ({ mockApi: { agencies: async () => ["mock"] } }),
    fetch: async () => { throw new Error("Backend unavailable"); },
  });
  const failure = await Promise.resolve(exports.api!.agencies()).then(() => "unexpected success", error => String(error));
  expect(failure).toContain("Backend unavailable");
});

test("directory preserves office identity and excludes unreviewed scrape logos", () => {
  expect(umrahDirectory).toHaveLength(1194);
  expect(new Set(umrahDirectory.map(agency => agency.id)).size).toBe(1194);
  expect(umrahDirectory[0].logoUrl).toBeUndefined();
  expect(umrahDirectory.filter(agency => agency.logoUrl)).toHaveLength(218);
  for (const agency of umrahDirectory.filter(agency => agency.logoUrl?.startsWith("/"))) {
    expect(existsSync(`agency_info/images/${agency.logoUrl!.split("/").pop()}`)).toBe(true);
  }
  expect(normalizeAgencyName("Travel & Tours Sdn. Bhd.")).toBe(normalizeAgencyName("TRAVEL AND TOURS SDN BHD"));
});

test("directory maps only matching provider inventory and preserves product IDs", async () => {
  const catalogue = createUmrahDirectoryCatalogue(umrahDirectory[0], mockApi);
  const products = await catalogue.products();
  expect(products).toHaveLength(2);
  expect(products.every(product => product.provider_id === umrahDirectory[0].id)).toBe(true);
  expect(products[0].id).toBe("mock-standard-umrah");
  expect(await catalogue.departures(products[0].id)).toEqual(await mockApi.departures(products[0].id));
  const differentLicence = { ...umrahDirectory[0], license_no: "6467/branch" };
  expect(await createUmrahDirectoryCatalogue(differentLicence, mockApi).products()).toEqual([]);
  const differentName = { ...umrahDirectory[0], name: "Unrelated Company" };
  expect(await createUmrahDirectoryCatalogue(differentName, mockApi).products()).toEqual([]);
});

test("directory has an empty result for unconnected providers and propagates errors", async () => {
  expect(await createUmrahDirectoryCatalogue(umrahDirectory[1], mockApi).products()).toEqual([]);
  for (const message of ["Invalid session", "Upstream error", "Request timeout"]) {
    const source = { ...mockApi, products: async () => { throw new Error(message); } };
    await expect(createUmrahDirectoryCatalogue(umrahDirectory[0], source).products()).rejects.toThrow(message);
  }
});

for (const width of [320, 375, 390, 430]) {
  test(`Umrah directory matches PJH tiles at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 740 });
    await page.goto("http://localhost:3000/umrah");
    await page.getByRole("button", { name: "Join The Platform" }).click();
    const grid = page.getByRole("list", { name: "Umrah agencies" });
    await expect(grid.getByRole("listitem")).toHaveCount(umrahAgencyBrands.length);
    expect(await grid.evaluate(element => getComputedStyle(element).gridTemplateColumns.split(" ").length)).toBe(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.screenshot({ path: `test-results/umrah-directory-${width}.png` });
    const first = grid.getByRole("button").first();
    await first.focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    expect(await first.evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe("none");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: umrahDirectory[0].name, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Standard Umrah Package/ })).toBeVisible();
    await page.getByRole("button", { name: "Back to agencies" }).click();
    await expect(first).toBeFocused();
    await grid.getByRole("button").nth(1).click();
    await expect(page.getByText("No packages available for this agency.")).toBeVisible();
  });
}

test("search, empty filters and failed logos retain navigation", async ({ page }) => {
  await page.route("https://assets.tabunghaji.gov.my/**", route => route.abort());
  await page.route("**/images/agency-logos/**", route => route.abort());
  await page.goto("http://localhost:3000/umrah");
  await page.getByRole("button", { name: "Join The Platform" }).click();
  await page.getByRole("button", { name: "Filter agencies" }).click();
  await page.getByLabel("Search agencies").fill("no-such-agency-1234567");
  await expect(page.getByText("No agencies match your filters.")).toBeVisible();
  await page.getByLabel("Search agencies").fill("ANDALUSIA");
  await page.getByRole("button", { name: "Filter agencies" }).click();
  const tile = page.getByRole("list", { name: "Umrah agencies" }).getByRole("button").first();
  await expect(tile).toHaveText(/ANDALUSIA/);
  await tile.click();
  await expect(page.getByText("No packages available for this agency.")).toBeVisible();
  await page.getByRole("button", { name: "Back to agencies" }).click();
  await expect(tile).toBeFocused();
});

test("a collected PJH-matched logo renders locally in Umrah", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 740 });
  await page.goto("http://localhost:3000/umrah");
  await page.getByRole("button", { name: "Join The Platform" }).click();
  await page.getByRole("button", { name: "Filter agencies" }).click();
  await page.getByLabel("Search agencies").fill("ANDALUSIA");
  await page.getByRole("button", { name: "Filter agencies" }).click();
  const logo = page.getByRole("list", { name: "Umrah agencies" }).locator("img").first();
  await expect(logo).toHaveAttribute("src", /\/images\/agency-logos\/pjh-5\.png$/);
  await expect.poll(() => logo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({ path: "test-results/umrah-local-logos-390.png" });
});
