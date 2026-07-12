import { test, expect } from "@playwright/test";
import { randomUUID } from "crypto";

const BASE_URL = "http://localhost:3000";

function getUniqueStartAt(
  offsetDays: number,
  hour: number,
  minute: number,
): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  date.setHours(hour, minute, 0, 0);
  date.setMilliseconds(Math.floor(Math.random() * 1000));
  return date.toISOString();
}

test("Гость может забронировать слот", async ({ page, request }) => {
  const eventTypeId = "test-" + randomUUID().slice(0, 6);
  const eventTitle = "Playwright Test Event " + Date.now();

  const createTypeRes = await request.post(`${BASE_URL}/admin/event-types`, {
    data: {
      id: eventTypeId,
      title: eventTitle,
      description: "Created by Playwright",
      durationMinutes: 30,
    },
  });
  expect(createTypeRes.status()).toBe(200);

  const startAt = getUniqueStartAt(10, 10, 0);

  const bookingRes = await request.post(`${BASE_URL}/bookings`, {
    data: {
      eventTypeId,
      startAt,
      guestName: "Test User",
      guestEmail: "test@example.com",
    },
  });
  expect(bookingRes.status()).toBe(200);

  await page.goto("/admin/bookings");
  await page.waitForSelector("table tbody tr", { timeout: 10000 });
  const row = page.locator(`table tbody tr:has-text("${eventTypeId}")`);
  await expect(row).toBeVisible({ timeout: 15000 });
  await expect(row.locator('td:has-text("Test User")')).toBeVisible();
});

test("Повторное бронирование того же слота возвращает ошибку", async ({
  page,
  request,
}) => {
  const eventTypeId = "test-conflict-" + randomUUID().slice(0, 6);
  const eventTitle = "Conflict Test " + Date.now();

  const createTypeRes = await request.post(`${BASE_URL}/admin/event-types`, {
    data: {
      id: eventTypeId,
      title: eventTitle,
      description: "Test for conflict",
      durationMinutes: 30,
    },
  });
  expect(createTypeRes.status()).toBe(200);

  const startAt = getUniqueStartAt(11, 11, 0);

  const firstRes = await request.post(`${BASE_URL}/bookings`, {
    data: {
      eventTypeId,
      startAt,
      guestName: "First User",
      guestEmail: "first@example.com",
    },
  });
  expect(firstRes.status()).toBe(200);

  const secondRes = await request.post(`${BASE_URL}/bookings`, {
    data: {
      eventTypeId,
      startAt,
      guestName: "Second User",
      guestEmail: "second@example.com",
    },
  });
  expect(secondRes.status()).toBe(409);
  const errorBody = await secondRes.json();
  expect(errorBody.code).toBe("slot_unavailable");
  expect(errorBody.message).toContain("already booked");

  await page.goto("/admin/bookings");
  await page.waitForSelector("table tbody tr", { timeout: 10000 });
  const row = page.locator(`table tbody tr:has-text("${eventTypeId}")`);
  await expect(row).toBeVisible({ timeout: 10000 });
  await expect(row.locator('td:has-text("First User")')).toBeVisible();
  await expect(row.locator('td:has-text("Second User")')).not.toBeVisible();
});
