import { test, expect } from '@playwright/test';
import { demoStations } from '../../src/lib/providers/demo';

test('live UI repeats explicit searches without caching, while current-result interactions stay local', async ({ page }) => {
  const requests: { radius: number; offset: number; outer?: boolean }[] = [];
  const sample = demoStations().find(station => station.prices.regular)!;
  const stations = Array.from({ length: 200 }, (_, i) => ({ ...sample, id: `fixture-${i}`, name: `Fixture ${i}`, position: { lat: 33.685, lng: -117.8265 } }));
  // All API calls are intercepted before navigation; no HERE credential or request is used.
  await page.route('**/api/**', async route => {
    if (new URL(route.request().url()).pathname !== '/api/stations') {
      await route.fulfill({ json: { locations: [{ id: 'fixture', label: 'Irvine, CA', displayName: 'Irvine, CA', position: { lat: 33.6846, lng: -117.8265 }, countryCode: 'USA' }] } });
      return;
    }
    const body = route.request().postDataJSON(); requests.push(body);
    const offset = body.outer ? 150 : body.offset;
    await route.fulfill({ json: { stations: stations.slice(offset, offset + 50), total: 200, retrievedCount: offset + 50, nextOffset: offset < 150 ? offset + 50 : null, complete: offset === 150, fetchedAt: new Date().toISOString() } });
  });
  await page.goto('/');
  await expect(page.locator('.demo-banner')).toHaveCount(0);
  await expect(page.locator('.location-search .here-notice')).toBeVisible();
  await page.getByLabel('Search by city, ZIP, or address').fill('Irvine');
  await page.getByRole('button', { name: 'Search location', exact: true }).click();
  await expect(page.locator('.station-card')).toHaveCount(20);
  expect(requests).toHaveLength(1);
  await expect(page.locator('.tier-badge').first()).toHaveText('Mid-range');
  await expect(page.locator('.results-summary')).not.toContainText(/Avg\.|average|\$/i);
  await page.getByRole('combobox', { name: 'Sort by' }).selectOption('nearest');
  await page.getByRole('combobox', { name: 'Fuel grade' }).selectOption('premium');
  await page.getByRole('combobox', { name: 'Fuel grade' }).selectOption('regular');
  await page.getByRole('button', { name: 'Show More', exact: true }).click();
  await expect(page.locator('.station-card')).toHaveCount(40);
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(page.locator('.map-price-pin')).toHaveCount(50);
  expect(requests).toHaveLength(1);
  await page.getByRole('button', { name: 'Show More', exact: true }).click();
  await expect(page.locator('.map-price-pin')).toHaveCount(100);
  expect(requests).toHaveLength(2); expect(requests[1].offset).toBe(50);
  for (const [radius, count] of [[10, 4], [15, 6], [10, 8], [5, 9]]) {
    await page.getByRole('combobox', { name: 'Radius', exact: true }).selectOption(String(radius));
    await expect.poll(() => requests.length).toBe(count);
    await expect(page.locator('.map-price-pin')).toHaveCount(radius === 5 ? 50 : 100);
  }
  await page.getByRole('button', { name: /Change location/ }).click();
  await page.getByLabel('Search by city, ZIP, or address').fill('Irvine');
  await page.getByRole('button', { name: 'Search location', exact: true }).click();
  await expect.poll(() => requests.length).toBe(10);
  await expect(page.locator('.map-price-pin')).toHaveCount(50);
});
