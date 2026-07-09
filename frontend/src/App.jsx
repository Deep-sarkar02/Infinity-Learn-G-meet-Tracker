import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ToastProvider } from "./components/ui/ToastProvider";
import { PageTransitionLayout } from "./components/motion/PageTransitionLayout";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { ProtectedRoute, PublicOnlyRoute } from "./components/layout/RouteGuards";
import { LoginPage } from "./pages/auth/LoginPage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AddTeacherPage } from "./pages/admin/AddTeacherPage";
import { ManageTeachersPage } from "./pages/admin/ManageTeachersPage";
import { BookingWindowPage } from "./pages/admin/BookingWindowPage";
import { AllBookingsPage } from "./pages/admin/AllBookingsPage";
import { MentorSlotAnalyticsPage } from "./pages/admin/MentorSlotAnalyticsPage";
import { TeacherDashboardPage } from "./pages/teacher/TeacherDashboardPage";
import { AvailabilityPage } from "./pages/teacher/AvailabilityPage";
import { CalendarPage } from "./pages/teacher/CalendarPage";
import { TeacherBookingHistoryPage } from "./pages/teacher/TeacherBookingHistoryPage";
import { TeacherAssignmentsPage } from "./pages/teacher/TeacherAssignmentsPage";
import { HomePage } from "./pages/HomePage";
import { OpenBookingPage } from "./pages/public/OpenBookingPage";
import { RosterStudentsPage } from "./pages/admin/RosterStudentsPage";
import { AddRosterStudentPage } from "./pages/admin/AddRosterStudentPage";

const App = () => (
  <ToastProvider>
    <BrowserRouter>
      <Routes>
        <Route element={<PageTransitionLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/book" element={<OpenBookingPage />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route
          path="/login/admin"
          element={
            <PublicOnlyRoute forRole="admin">
              <LoginPage expectedRole="admin" />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/login/teacher"
          element={
            <PublicOnlyRoute forRole="teacher">
              <LoginPage expectedRole="teacher" />
            </PublicOnlyRoute>
          }
        />
        <Route path="/signup" element={<Navigate to="/" replace />} />

        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/teachers/add"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AddTeacherPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/teachers"
            element={
              <ProtectedRoute roles={["admin"]}>
                <ManageTeachersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/booking-window"
            element={
              <ProtectedRoute roles={["admin"]}>
                <BookingWindowPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/slot-analytics"
            element={
              <ProtectedRoute roles={["admin"]}>
                <MentorSlotAnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/bookings"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AllBookingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/roster"
            element={
              <ProtectedRoute roles={["admin"]}>
                <RosterStudentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/roster/add"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AddRosterStudentPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/teacher"
            element={
              <ProtectedRoute roles={["teacher"]}>
                <TeacherDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/availability"
            element={
              <ProtectedRoute roles={["teacher"]}>
                <AvailabilityPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/calendar"
            element={
              <ProtectedRoute roles={["teacher"]}>
                <CalendarPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/history"
            element={
              <ProtectedRoute roles={["teacher"]}>
                <TeacherBookingHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/assignments"
            element={
              <ProtectedRoute roles={["teacher"]}>
                <TeacherAssignmentsPage />
              </ProtectedRoute>
            }
          />

        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </ToastProvider>
);

export default App;
