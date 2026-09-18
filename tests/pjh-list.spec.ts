import { expect, test } from "@playwright/test";
import directory from "../agency_info/pjh_1448H_2027M.json";

for (const width of [320, 375, 390, 430]) {
  test(`Amani package header has a small logo on the left at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 740 });
    await page.goto("http://localhost:3000/hajj");
    await page.getByRole("button", { name: "PJH List" }).click();
    await page.getByRole("button", { name: "View packages by Amani Travel Sdn Bhd", exact: true }).click();
    const heading = page.getByRole("heading", { name: "Amani Travel Sdn Bhd", exact: true });
    await expect(heading).toBeVisible();
    const header = heading.locator("../..");
    const logo = header.locator("img");
    await expect(logo).toHaveAttribute("src", directory.pjh[3].logo_url);
    await expect.poll(() => logo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    const logoBox = await logo.boundingBox();
    const headingBox = await heading.boundingBox();
    expect(logoBox!.width).toBeLessThanOrEqual(52);
    expect(logoBox!.x + logoBox!.width).toBeLessThan(headingBox!.x);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.screenshot({ path: `test-results/amani-header-${width}.png` });
  });
}

for (const width of [320, 375, 390, 430]) {
  test(`PJH directory fits and scrolls at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 740 });
    await page.goto("http://localhost:3000/hajj", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "PJH List" }).click();
    const list = page.getByRole("list", { name: "PJH agencies" });
    await expect(list.getByRole("listitem")).toHaveCount(directory.total_pjh);
    const layout = await list.evaluate(element => ({
      columns: getComputedStyle(element).gridTemplateColumns.split(" ").length,
      overflow: document.documentElement.scrollWidth > innerWidth,
      scrollable: element.parentElement!.scrollHeight > element.parentElement!.clientHeight,
    }));
    expect(layout).toEqual({ columns: 3, overflow: false, scrollable: true });
    await list.getByRole("listitem").last().scrollIntoViewIfNeeded();
    await expect(list.getByRole("listitem").last()).toBeInViewport();
    await page.screenshot({ path: `test-results/pjh-${width}.png` });
    await page.getByRole("button", { name: "Back to process overview" }).click();
    await expect(page.getByRole("button", { name: "PJH List" })).toBeVisible();
  });
}

test("failed logos show company names without catalogue requests", async ({ page }) => {
  const apiRequests: string[] = [];
  page.on("request", request => { if (request.url().includes("/api/")) apiRequests.push(request.url()); });
  await page.route("https://assets.tabunghaji.gov.my/**", route => route.abort());
  await page.goto("http://localhost:3000/hajj", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "PJH List" }).click();
  await expect(page.getByText(directory.pjh[0].company_name, { exact: true })).toBeVisible();
  expect(apiRequests.filter(url => /agencies|products/.test(url))).toEqual([]);
});

for (const width of [320, 430]) {
  test(`PJH logos open packages and travel plans at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 740 });
    const requests: string[] = [];
    page.on("request", request => { if (request.url().includes("/api/")) requests.push(request.url()); });
    await page.goto("http://localhost:3000/hajj", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "PJH List" }).click();
    const logo = page.getByRole("button", { name: `View packages by ${directory.pjh[32].company_name}`, exact: true });
    await logo.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: directory.pjh[32].company_name, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Hajj (Standard|Comfort|Premium) Package/ })).toHaveCount(3);
    await page.screenshot({ path: `test-results/pjh-packages-${width}.png` });
    await page.getByRole("button", { name: /Hajj Comfort Package/ }).click();
    await page.getByRole("button", { name: /05 May 2027 - 26 May 2027/ }).click();
    await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirm Payment" })).toBeDisabled();
    await page.getByRole("button", { name: "Back to travel plans" }).click();
    await page.getByRole("button", { name: "Back to packages" }).click();
    await page.getByRole("button", { name: "Back to agencies" }).click();
    await expect(logo).toBeFocused();
    await page.getByRole("button", { name: `View packages by ${directory.pjh[0].company_name}`, exact: true }).click();
    await expect(page.getByRole("heading", { name: directory.pjh[0].company_name, exact: true })).toBeVisible();
    expect(requests.filter(url => /agencies|products|departures|bookings|payments/.test(url))).toEqual([]);
  });
}
