import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarClock } from "lucide-react";

import { adminApi } from "@/api/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BookingWithEventType } from "@/types/api";

export function AdminBookingsPage() {
  const [bookings, setBookings] = useState<BookingWithEventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .listUpcomingBookings()
      .then(setBookings)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-muted-foreground">Загрузка встреч…</p>;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Ошибка загрузки</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="size-5" />
          Предстоящие встречи
        </CardTitle>
        <CardDescription>
          Все бронирования на все типы событий, отсортированные по времени
          начала.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Нет предстоящих встреч.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Гость</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Тип события</TableHead>
                <TableHead>Начало</TableHead>
                <TableHead>Длительность</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-medium">
                    {booking.guestName}
                  </TableCell>
                  <TableCell>{booking.guestEmail}</TableCell>
                  <TableCell>
                    <div>
                      <div>{booking.eventType.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {booking.eventType.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(parseISO(booking.startAt), "d MMMM yyyy, HH:mm", {
                      locale: ru,
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {booking.eventType.durationMinutes} мин
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
