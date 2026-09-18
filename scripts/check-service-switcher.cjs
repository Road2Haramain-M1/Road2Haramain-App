const { chromium, expect } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  try {
    for (const width of [320, 375, 390, 430]) {
      const page = await browser.newPage({ viewport: { width, height: 844 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://localhost:3000/umrah');
      const trigger = page.getByRole('button', { name: 'Open service switcher' });
      await trigger.click();
      const nav = page.getByRole('navigation', { name: 'Switch service' });
      await expect(nav.getByRole('link')).toHaveCount(6);
      await expect(nav.getByRole('link', { name: 'Umrah', exact: true })).toHaveCount(0);
      await page.waitForTimeout(500);
      const boxes = [];
      for (const link of await nav.getByRole('link').all()) {
        const box = await link.boundingBox();
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
        const label = await link.locator(':scope > span').first().boundingBox();
        const icon = await link.locator(':scope > span').last().boundingBox();
        expect(label.x + label.width).toBeLessThan(icon.x);
        // Transformed browser rectangles can differ by tiny floating-point fractions.
        expect(Math.round(icon.width)).toBeGreaterThanOrEqual(44);
        expect(Math.round(icon.height)).toBeGreaterThanOrEqual(44);
        for (const previous of boxes) {
          expect(box.y).toBeGreaterThanOrEqual(previous.y + previous.height + 8);
          expect(box.x + box.width).toBeCloseTo(previous.x + previous.width, 1);
        }
        boxes.push(box);
        await link.click({ trial: true });
      }
      const triggerBox = await page.getByRole('button', { name: 'Close service switcher' }).boundingBox();
      expect(boxes[0].y - triggerBox.y).toBeLessThan(65);
      await page.screenshot({ path: `service-menu-${width}.png` });
      await page.keyboard.press('Escape');
      await expect(trigger).toBeFocused();
      await expect(nav).toBeHidden();
      await page.keyboard.press('Enter');
      await page.keyboard.press('Tab');
      await expect(nav.getByRole('link').first()).toBeFocused();
      await page.mouse.click(10, 500);
      await expect(nav).toBeHidden();
      await trigger.click();
      await nav.getByRole('link', { name: 'Hajj', exact: true }).click();
      await expect(page).toHaveURL(/\/hajj$/);
      await expect(page.getByRole('button', { name: 'Open service switcher' })).toBeVisible();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.getByRole('button', { name: 'Open service switcher' }).click();
      expect(await page.getByRole('navigation', { name: 'Switch service' }).getByRole('link').first().evaluate(el => getComputedStyle(el).animationName)).toBe('none');
      expect(errors).toEqual([]);
      console.log(`PASS ${width}: petal bounds/clicks, navigation, keyboard, dismissal, reduced motion`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
