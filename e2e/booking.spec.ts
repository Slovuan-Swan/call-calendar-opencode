import { test, expect } from "@playwright/test";
import { randomUUID } from "crypto";

test.beforeEach(async ({ page }) => {
  // Очищаем данные перед каждым тестом – перезапускаем бэкенд (опционально, но для CI лучше)
  // Но мы не можем перезапустить бэкенд из теста. Вместо этого будем удалять созданные типы.
  // Однако простой способ – использовать уникальные ID, которые не пересекаются.
});

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

  // Ждём появления строки в таблице с этим ID
  await expect(
    page.locator(`table tbody tr:has-text("${eventTypeId}")`),
  ).toBeVisible({ timeout: 10000 });

  // 2. Переходим на главную и выбираем созданный тип
  await page.goto("/");

  // Ищем карточку по уникальному заголовку (теперь он уникален)
  const card = page
    .locator('[data-slot="card"]')
    .filter({ hasText: eventTitle });
  await expect(card).toBeVisible({ timeout: 10000 });
  await card.getByRole("link", { name: "Выбрать время" }).click();

  // 3. Ждём появления кнопок слотов
  await page.waitForSelector('button:has-text("09:00")', { timeout: 15000 });
  const firstSlot = page.locator('button:has-text("09:00")').first();
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
  // Используем фильтр по ID и имени
  const row = page.locator(`table tbody tr:has-text("${eventTypeId}")`);
  await expect(row).toBeVisible({ timeout: 10000 });
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
  await page.waitForSelector('button:has-text("09:00")', { timeout: 15000 });
  const firstSlot = page.locator('button:has-text("09:00")').first();
  await firstSlot.click();
  await page.fill("input#guestName", "First User");
  await page.fill("input#guestEmail", "first@example.com");
  await page.click('button:has-text("Забронировать")');
  await expect(page.locator("text=Бронирование создано")).toBeVisible({
    timeout: 10000,
  });

  // Повторное бронирование того же слота
  await page.goto(`/book/${eventTypeId}`);
  await page.waitForSelector('button:has-text("09:00")', { timeout: 15000 });
  const sameSlot = page.locator('button:has-text("09:00")').first();
  await sameSlot.click();
  await page.fill("input#guestName", "Second User");
  await page.fill("input#guestEmail", "second@example.com");
  await page.click('button:has-text("Забронировать")');

  // Ищем сообщение об ошибке в alert (может быть внутри dialog или просто на странице)
  // Используем поиск по тексту с учётом возможных вариаций
  const errorLocator = page.locator(
    '[data-slot="alert"]:has-text("Slot already booked")',
  );
  await expect(errorLocator).toBeVisible({ timeout: 10000 });
});
