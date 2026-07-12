import { test, expect } from "@playwright/test";
import { randomUUID } from "crypto";

test("Гость может забронировать слот", async ({ page }) => {
  // 1. Создаём тип события через админку
  const eventTypeId = "test-" + randomUUID().slice(0, 6);
  const eventTitle = "Playwright Test Event";
  await page.goto("/admin/event-types");
  await page.fill("input#id", eventTypeId);
  await page.fill("input#title", eventTitle);
  await page.fill("textarea#description", "Created by Playwright");
  await page.fill("input#duration", "30");
  await page.click('button[type="submit"]');

  // Проверяем, что строка с созданным типом появилась в таблице
  await expect(
    page.locator(`table tbody tr:has-text("${eventTypeId}")`),
  ).toBeVisible();

  // 2. Переходим на главную и выбираем созданный тип по заголовку
  await page.goto("/");
  await expect(page.getByRole("heading", { name: eventTitle })).toBeVisible();
  await page.click(`a[href="/book/${eventTypeId}"]`);

  // 3. Выбираем первый доступный слот (первая кнопка "09:00")
  await page.waitForSelector('button:has-text("09:00")', { timeout: 10000 });
  const firstSlot = page.locator('button:has-text("09:00")').first();
  await firstSlot.click();

  // 4. Заполняем форму и отправляем
  await page.fill("input#guestName", "Test User");
  await page.fill("input#guestEmail", "test@example.com");
  await page.click('button:has-text("Забронировать")');

  // 5. Проверяем успешное создание (сообщение или закрытие диалога)
  await expect(page.locator("text=Бронирование создано")).toBeVisible({
    timeout: 5000,
  });

  // 6. Проверяем, что запись появилась в админке (ищем по eventTypeId)
  await page.goto("/admin/bookings");
  // Ищем строку, содержащую eventTypeId, и в ней проверяем имя гостя
  const row = page.locator(`table tbody tr:has-text("${eventTypeId}")`);
  await expect(row).toBeVisible();
  await expect(row.locator('td:has-text("Test User")')).toBeVisible();
});

test("Повторное бронирование того же слота возвращает ошибку", async ({
  page,
}) => {
  // Создаём тип события
  const eventTypeId = "test-conflict-" + randomUUID().slice(0, 6);
  const eventTitle = "Conflict Test";
  await page.goto("/admin/event-types");
  await page.fill("input#id", eventTypeId);
  await page.fill("input#title", eventTitle);
  await page.fill("textarea#description", "Test for conflict");
  await page.fill("input#duration", "30");
  await page.click('button[type="submit"]');
  await expect(
    page.locator(`table tbody tr:has-text("${eventTypeId}")`),
  ).toBeVisible();

  // Бронируем слот первый раз
  await page.goto(`/book/${eventTypeId}`);
  await page.waitForSelector('button:has-text("09:00")', { timeout: 10000 });
  const firstSlot = page.locator('button:has-text("09:00")').first();
  await firstSlot.click();
  await page.fill("input#guestName", "First User");
  await page.fill("input#guestEmail", "first@example.com");
  await page.click('button:has-text("Забронировать")');
  await expect(page.locator("text=Бронирование создано")).toBeVisible({
    timeout: 5000,
  });

  // Пытаемся забронировать тот же слот второй раз (на той же странице)
  await page.goto(`/book/${eventTypeId}`);
  await page.waitForSelector('button:has-text("09:00")', { timeout: 10000 });
  const sameSlot = page.locator('button:has-text("09:00")').first();
  await sameSlot.click();
  await page.fill("input#guestName", "Second User");
  await page.fill("input#guestEmail", "second@example.com");
  await page.click('button:has-text("Забронировать")');

  // Должна появиться ошибка "Slot already booked" (сообщение от бэкенда)
  await expect(page.locator("text=Slot already booked")).toBeVisible({
    timeout: 5000,
  });
});
