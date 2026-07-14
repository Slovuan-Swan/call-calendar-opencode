import { Router } from "express";
import {
  bookings,
  addBooking,
  findEventType,
  isSlotTaken,
  getBookings,
} from "../store";
import { Booking, ErrorResponse } from "../types";
import { parseISO, isWithinInterval, addDays, startOfDay } from "date-fns";

const router = Router();

router.post("/", (req, res) => {
  const { eventTypeId, startAt, guestName, guestEmail } = req.body;
  if (!eventTypeId || !startAt || !guestName || !guestEmail) {
    return res
      .status(400)
      .json({ code: "validation_error", message: "Missing required fields" });
  }

  const eventType = findEventType(eventTypeId);
  if (!eventType) {
    return res
      .status(404)
      .json({ code: "not_found", message: "Event type not found" });
  }

  const now = new Date();
  const windowStart = startOfDay(now);
  const windowEnd = addDays(windowStart, 14);
  const bookingDate = parseISO(startAt);
  if (!isWithinInterval(bookingDate, { start: windowStart, end: windowEnd })) {
    return res.status(400).json({
      code: "booking_window_exceeded",
      message: "Booking date is outside the allowed window",
    });
  }

  const endAt = new Date(parseISO(startAt));
  endAt.setMinutes(endAt.getMinutes() + eventType.durationMinutes);
  const endAtISO = endAt.toISOString();

  if (isSlotTaken(startAt, endAtISO)) {
    return res.status(409).json({
      code: "slot_unavailable",
      message: "Slot already booked",
    });
  }

  const newBooking: Booking = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    eventTypeId,
    startAt,
    endAt: endAtISO,
    guestName,
    guestEmail,
  };
  addBooking(newBooking);
  res.status(200).json(newBooking);
});

router.get("/", (req, res) => {
  const from = req.query.from as string | undefined;
  const list = getBookings(from);
  list.sort((a, b) => a.startAt.localeCompare(b.startAt));
  const enriched = list.map((b) => {
    const et = findEventType(b.eventTypeId);
    return { ...b, eventType: et };
  });
  res.json(enriched);
});

export default router;
