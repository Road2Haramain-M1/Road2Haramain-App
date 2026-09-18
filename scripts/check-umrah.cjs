const { chromium, expect } = require("@playwright/test");
const { readFile } = require("node:fs/promises");

(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    for (const width of [320, 375, 390, 430]) {
      const page = await browser.newPage({ viewport: { width, height: 844 } });
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto("http://localhost:3000/umrah", { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await expect(page.getByRole("heading", { name: "Umrah", exact: true })).toBeVisible();
      if (width === 390) await page.screenshot({ path: "umrah-redesign-intro.png", fullPage: true });
      await page.getByRole("button", { name: "Join The Platform" }).click();
      await page.getByRole("button", { name: /A&M BERKAT/ }).click();
      if (width === 390) await page.screenshot({ path: "umrah-redesign-packages.png", fullPage: true });
      await page.getByRole("button", { name: /Standard Umrah Package/ }).click();
      await expect(page.getByText("Available Travel Plans", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: /15 Oct 2026/ }).first().click();
      await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Confirm Payment" })).toBeDisabled();
      await page.getByRole("button", { name: "Terms & Conditions", exact: true }).click();
      const termsDialog = page.getByRole("dialog", { name: "Terms & Conditions" });
      await expect(termsDialog).toBeVisible();
      await page.waitForTimeout(300);
      const termsBox = await termsDialog.boundingBox();
      expect(termsBox.y).toBeLessThanOrEqual(16);
      expect(termsBox.height).toBeGreaterThanOrEqual(820);
      await expect(termsDialog.getByRole("heading", { name: /Road2Haramain Terms & Conditions/ })).toBeVisible();
      await expect(termsDialog.locator("table")).toHaveCount(3);
      await expect(page.getByLabel("Agree with")).not.toBeChecked();
      await page.keyboard.press("Escape");
      await expect(termsDialog).toBeHidden();
      await expect(page.getByRole("button", { name: "Terms & Conditions", exact: true })).toBeFocused();
      if (width === 390) await page.screenshot({ path: "umrah-redesign-overview.png", fullPage: true });
      await page.getByLabel("Agree with").check();
      await page.getByRole("button", { name: "Confirm Payment" }).click();
      await expect(page.getByRole("heading", { name: "Payment Confirmed" })).toBeVisible();
      await expect(page.getByText("Issued by", { exact: true })).toBeVisible();
      await expect(page.getByText("My Mega Holidays Sdn. Bhd.", { exact: true })).toBeVisible();
      await expect(page.getByAltText("My Mega Holidays")).toBeVisible();
      if (width === 390) await page.screenshot({ path: "umrah-redesign-receipt.png", fullPage: true });
      const downloadEvent = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download Receipt", exact: true }).click();
      const download = await downloadEvent;
      expect(download.suggestedFilename()).toBe("road2haramain-receipt.html");
      const html = await readFile(await download.path(), "utf8");
      expect(html).not.toMatch(/preview|simulated|No real payment/i);
      await expect(page.getByText("LOCAL PREVIEW", { exact: false })).toHaveCount(0);
      expect(html).toContain("Standard Umrah Package");
      expect(html).toContain("RM 500.00");
      expect(html).toContain("15 Oct 2026");
      expect(html).toContain("My Mega Holidays Sdn. Bhd.");
      expect(html).toContain("data:image/jpeg;base64,");
      expect(html).not.toContain("<script");
      await page.getByRole("link", { name: "Back to Home", exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: `receipt-actions-${width}.png` });
      await page.getByRole("link", { name: "Back to Home", exact: true }).click();
      await expect(page).toHaveURL("http://localhost:3000/");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect.poll(() => page.locator("img").evaluateAll(images => images.every(img => img.complete && img.naturalWidth > 0))).toBe(true);
      expect(errors).toEqual([]);
      console.log("PASS", width, "full flow, back navigation, terms gate, images, no overflow/errors");
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
