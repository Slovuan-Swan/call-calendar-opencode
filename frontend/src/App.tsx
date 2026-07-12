import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout, AppLayout } from "@/components/layout/AppLayout";
import { AdminEventTypesPage } from "@/pages/admin/EventTypesPage";
import { AdminBookingsPage } from "@/pages/admin/BookingsPage"; // только что создали
import { GuestEventTypesPage } from "@/pages/guest/EventTypesPage";
import { GuestBookPage } from "@/pages/guest/BookPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Гостевые маршруты с общим лейаутом */}
        <Route path="/" element={<AppLayout />}>
          <Route index element={<GuestEventTypesPage />} />
          <Route path="book/:id" element={<GuestBookPage />} />
        </Route>

        {/* Админские маршруты с отдельным лейаутом */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/event-types" replace />} />
          <Route path="event-types" element={<AdminEventTypesPage />} />
          <Route path="bookings" element={<AdminBookingsPage />} />
        </Route>

        {/* 404 – можно добавить позже */}
        <Route path="*" element={<div>Страница не найдена</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
