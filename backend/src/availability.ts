import { eventTypes, bookings, isSlotTaken } from './store';
import { addDays, startOfDay, parseISO, addMinutes, formatISO } from 'date-fns';

const BOOKING_WINDOW_DAYS = 14;
const SLOT_STEP_MINUTES = 30;
const WORK_START_HOUR = 9;
const WORK_END_HOUR = 18;

export function generateAvailableSlots(
  eventTypeId: string,
  from?: string,
  to?: string
): { startAt: string; endAt: string }[] {
  const eventType = eventTypes.find(et => et.id === eventTypeId);
  if (!eventType) return [];

  const now = new Date();
  const windowStart = from ? parseISO(from) : startOfDay(now);
  const windowEnd = to ? parseISO(to) : startOfDay(addDays(now, BOOKING_WINDOW_DAYS));

  const slots: { startAt: string; endAt: string }[] = [];

  let currentDay = startOfDay(windowStart);
  while (currentDay <= windowEnd) {
    let hour = WORK_START_HOUR;
    while (hour < WORK_END_HOUR) {
      let minute = 0;
      while (minute < 60) {
        const slotStart = new Date(currentDay);
        slotStart.setHours(hour, minute, 0, 0);
        if (slotStart < windowStart) {
          minute += SLOT_STEP_MINUTES;
          continue;
        }
        const slotEnd = addMinutes(slotStart, eventType.durationMinutes);
        if (slotEnd > windowEnd || slotEnd.getHours() > WORK_END_HOUR || (slotEnd.getHours() === WORK_END_HOUR && slotEnd.getMinutes() > 0)) {
          break;
        }
        const startISO = formatISO(slotStart);
        const endISO = formatISO(slotEnd);
        if (!isSlotTaken(startISO, endISO)) {
          slots.push({
            startAt: startISO,
            endAt: formatISO(slotEnd)
          });
        }
        minute += SLOT_STEP_MINUTES;
      }
      hour++;
    }
    currentDay = addDays(currentDay, 1);
  }

  return slots;
}
