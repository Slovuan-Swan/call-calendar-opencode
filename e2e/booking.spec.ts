import { test, expect } from "@playwright/test";
import { randomUUID } from "crypto";

test("Гость может забронировать слот", async ({ page }) => {
  // 1. Создаём уникальный тип события через админку
  const eventTypeId = "test-" + randomUUID().slice(0, 6);
  await page.goto("/admin/event-types");

  // Заполняем форму и отправляем
  await page.fill("input#id", eventTypeId);
  await page.fill("input#title", "Playwright Test Event");
  await page.fill("textarea#description", "Created by Playwright");
  await page.fill("input#duration", "30");
  await page.click('button[type="submit"]');

  // Ожидаем, что наш новый тип появился в таблице (хотя бы одна строка с нашим id)
  await expect(
    page.locator(`table tbody tr:has-text("${eventTypeId}")`),
  ).toBeVisible({ timeout: 5000 });

  // 2. Переходим на главную и выбираем созданный тип
  await page.goto("/");
  // Ждём, пока карточка с нашим id появится
  await expect(page.locator(`a[href="/book/${eventTypeId}"]`)).toBeVisible({
    timeout: 5000,
  });
  await page.click(`a[href="/book/${eventTypeId}"]`);

  // 3. Выбираем первый доступный слот (первая кнопка с временем)
  // Ждём, пока появятся кнопки слотов
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

  // 6. Проверяем, что запись появилась в админке
  await page.goto("/admin/bookings");
  await expect(page.locator(`td:has-text("Test User")`)).toBeVisible();
  await expect(page.locator(`td:has-text("${eventTypeId}")`)).toBeVisible();
});

test("Повторное бронирование того же слота возвращает ошибку", async ({
  page,
}) => {
  // Создаём тип события
  const eventTypeId = "test-conflict-" + randomUUID().slice(0, 6);
  await page.goto("/admin/event-types");
  await page.fill("input#id", eventTypeId);
  await page.fill("input#title", "Conflict Test");
  await page.fill("textarea#description", "Test for conflict");
  await page.fill("input#duration", "30");
  await page.click('button[type="submit"]');
  await expect(
    page.locator(`table tbody tr:has-text("${eventTypeId}")`),
  ).toBeVisible({ timeout: 5000 });

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

  // Пытаемся забронировать тот же слот второй раз
  // Снова открываем страницу бронирования
  await page.goto(`/book/${eventTypeId}`);
  // Ждём, пока загрузится страница и появятся слоты
  await page.waitForSelector('button:has-text("09:00")', { timeout: 10000 });
  const sameSlot = page.locator('button:has-text("09:00")').first();
  await sameSlot.click();
  await page.fill("input#guestName", "Second User");
  await page.fill("input#guestEmail", "second@example.com");
  await page.click('button:has-text("Забронировать")');

  // Должна появиться ошибка
  await expect(page.locator("text=Слот уже занят")).toBeVisible({
    timeout: 5000,
  });
});
