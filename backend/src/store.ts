import { EventType, Booking } from "./types";

export const eventTypes: EventType[] = [];
export const bookings: Booking[] = [];

export function findEventType(id: string): EventType | undefined {
  return eventTypes.find((et) => et.id === id);
}

export function addEventType(eventType: EventType): void {
  eventTypes.push(eventType);
}

export function updateEventType(
  id: string,
  data: Partial<EventType>,
): EventType | undefined {
  const index = eventTypes.findIndex((et) => et.id === id);
  if (index === -1) return undefined;
  const updated = { ...eventTypes[index], ...data };
  eventTypes[index] = updated;
  return updated;
}

export function deleteEventType(id: string): boolean {
  const index = eventTypes.findIndex((et) => et.id === id);
  if (index === -1) return false;
  eventTypes.splice(index, 1);
  return true;
}

export function addBooking(booking: Booking): void {
  bookings.push(booking);
}

export function isSlotTaken(startAt: string, endAt: string): boolean {
  return bookings.some((b) => startAt < b.endAt && endAt > b.startAt);
}

export function getBookings(from?: string): Booking[] {
  if (!from) return bookings;
  return bookings.filter((b) => b.startAt >= from);
}
