import { test, expect } from "@playwright/test";
import { randomUUID } from "crypto";

test("Гость может забронировать слот", async ({ page }) => {
  const eventTypeId = "test-" + randomUUID().slice(0, 6);
  const eventTitle = "Playwright Test Event " + Date.now();

  // 1. Создаём тип события через админку
  await page.goto("/admin/event-types");
  await page.fill("input#id", eventTypeId);
  await page.fill("input#title", eventTitle);
  await page.fill("textarea#description", "Created by Playwright");
  await page.fill("input#duration", "30");
  await page.click('button[type="submit"]');

  await expect(
    page.locator(`table tbody tr:has-text("${eventTypeId}")`),
  ).toBeVisible({ timeout: 10000 });

  // 2. Переходим на главную и выбираем созданный тип
  await page.goto("/");
  const card = page
    .locator('[data-slot="card"]')
    .filter({ hasText: eventTitle });
  await expect(card).toBeVisible({ timeout: 10000 });
  await card.getByRole("link", { name: "Выбрать время" }).click();

  // 3. Выбираем первый доступный слот (любое время, формат HH:mm)
  // Ждём появления любой кнопки с текстом, содержащим двоеточие (формат времени)
  await page.waitForSelector('button:has-text(":")', { timeout: 15000 });
  // Берём первую такую кнопку
  const firstSlot = page.locator('button:has-text(":")').first();
  await firstSlot.click();

  // 4. Заполняем форму и отправляем
  await page.fill("input#guestName", "Test User");
  await page.fill("input#guestEmail", "test@example.com");
  await page.click('button:has-text("Забронировать")');

  // 5. Проверяем успешное создание
  await expect(page.locator("text=Бронирование создано")).toBeVisible({
    timeout: 10000,
  });

  // 6. Проверяем, что запись появилась в админке
  await page.goto("/admin/bookings");
  await page.waitForSelector("table tbody tr", { timeout: 10000 });
  const row = page.locator(`table tbody tr:has-text("${eventTypeId}")`);
  await expect(row).toBeVisible({ timeout: 15000 });
  await expect(row.locator('td:has-text("Test User")')).toBeVisible();
});

test("Повторное бронирование того же слота возвращает ошибку", async ({
  page,
}) => {
  const eventTypeId = "test-conflict-" + randomUUID().slice(0, 6);
  const eventTitle = "Conflict Test " + Date.now();

  // Создаём тип события
  await page.goto("/admin/event-types");
  await page.fill("input#id", eventTypeId);
  await page.fill("input#title", eventTitle);
  await page.fill("textarea#description", "Test for conflict");
  await page.fill("input#duration", "30");
  await page.click('button[type="submit"]');
  await expect(
    page.locator(`table tbody tr:has-text("${eventTypeId}")`),
  ).toBeVisible({ timeout: 10000 });

  // Первое бронирование
  await page.goto(`/book/${eventTypeId}`);
  await page.waitForSelector('button:has-text(":")', { timeout: 15000 });
  const firstSlot = page.locator('button:has-text(":")').first();
  await firstSlot.click();
  await page.fill("input#guestName", "First User");
  await page.fill("input#guestEmail", "first@example.com");
  await page.click('button:has-text("Забронировать")');
  await expect(page.locator("text=Бронирование создано")).toBeVisible({
    timeout: 10000,
  });

  // Закрываем диалог (перезагружаем страницу)
  await page.reload();

  // Повторное бронирование того же слота
  await page.goto(`/book/${eventTypeId}`);
  await page.waitForSelector('button:has-text(":")', { timeout: 15000 });
  const sameSlot = page.locator('button:has-text(":")').first();
  await sameSlot.click();
  await page.fill("input#guestName", "Second User");
  await page.fill("input#guestEmail", "second@example.com");
  await page.click('button:has-text("Забронировать")');

  // Ищем ошибку
  await expect(page.locator("text=/already booked/i")).toBeVisible({
    timeout: 15000,
  });
});
