import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';

test('Гость может забронировать слот', async ({ page }) => {
  // 1. Создаём тип события через админку
  const eventTypeId = 'test-' + randomUUID().slice(0, 6);
  await page.goto('/admin/event-types');
  await page.fill('input#id', eventTypeId);
  await page.fill('input#title', 'Playwright Test Event');
  await page.fill('textarea#description', 'Created by Playwright');
  await page.fill('input#duration', '30');
  await page.click('button[type="submit"]');
  await expect(page.locator('table tbody tr')).toHaveCount(1);

  // 2. Переходим на главную и выбираем созданный тип
  await page.goto('/');
  await expect(page.locator(`text=${eventTypeId}`)).toBeVisible();
  await page.click(`a[href="/book/${eventTypeId}"]`);

  // 3. Выбираем первый доступный слот (первая кнопка)
  await page.waitForSelector('button:has-text("09:00")', { timeout: 10000 });
  const firstSlot = page.locator('button:has-text("09:00")').first();
  await firstSlot.click();

  // 4. Заполняем форму и отправляем
  await page.fill('input#guestName', 'Test User');
  await page.fill('input#guestEmail', 'test@example.com');
  await page.click('button:has-text("Забронировать")');

  // 5. Проверяем успешное создание (сообщение или закрытие диалога)
  await expect(page.locator('text=Бронирование создано')).toBeVisible({ timeout: 5000 });

  // 6. Проверяем, что запись появилась в админке
  await page.goto('/admin/bookings');
  await expect(page.locator(`td:has-text("Test User")`)).toBeVisible();
  await expect(page.locator(`td:has-text("${eventTypeId}")`)).toBeVisible();
});

test('Повторное бронирование того же слота возвращает ошибку', async ({ page }) => {
  // Создаём тип события
  const eventTypeId = 'test-conflict-' + randomUUID().slice(0, 6);
  await page.goto('/admin/event-types');
  await page.fill('input#id', eventTypeId);
  await page.fill('input#title', 'Conflict Test');
  await page.fill('textarea#description', 'Test for conflict');
  await page.fill('input#duration', '30');
  await page.click('button[type="submit"]');
  await expect(page.locator('table tbody tr')).toHaveCount(1);

  // Бронируем слот первый раз
  await page.goto(`/book/${eventTypeId}`);
  await page.waitForSelector('button:has-text("09:00")', { timeout: 10000 });
  const firstSlot = page.locator('button:has-text("09:00")').first();
  await firstSlot.click();
  await page.fill('input#guestName', 'First User');
  await page.fill('input#guestEmail', 'first@example.com');
  await page.click('button:has-text("Забронировать")');
  await expect(page.locator('text=Бронирование создано')).toBeVisible({ timeout: 5000 });

  // Пытаемся забронировать тот же слот второй раз (на той же странице)
  await page.goto(`/book/${eventTypeId}`);
  await page.waitForSelector('button:has-text("09:00")', { timeout: 10000 });
  const sameSlot = page.locator('button:has-text("09:00")').first();
  await sameSlot.click();
  await page.fill('input#guestName', 'Second User');
  await page.fill('input#guestEmail', 'second@example.com');
  await page.click('button:has-text("Забронировать")');

  // Должна появиться ошибка
  await expect(page.locator('text=Слот уже занят')).toBeVisible({ timeout: 5000 });
});
