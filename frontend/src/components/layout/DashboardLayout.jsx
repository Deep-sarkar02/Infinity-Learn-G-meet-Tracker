import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion as M, useReducedMotion } from "framer-motion";
import { useAuthStore } from "../../models/auth.store";
import { cn } from "../../utils/cn";
import { pageEase } from "../motion/motionPresets";
import { authService } from "../../services/auth.service";
import { adminService } from "../../services/admin.service";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { TeacherSideNav } from "./teacher/TeacherSideNav";
import { TeacherTopBar } from "./teacher/TeacherTopBar";
import { TeacherRoutingBar } from "./teacher/TeacherRoutingBar";
import { TeacherCompletionGate } from "../teacher/TeacherCompletionGate";

const DashboardOutlet = () => {
  const location = useLocation();
  const reduce = useReducedMotion();
  return (
    <AnimatePresence mode="wait">
      <M.div
        key={location.pathname}
        className="w-full min-w-0"
        initial={reduce ? false : { opacity: 0, x: 18 }}
        animate={reduce ? undefined : { opacity: 1, x: 0 }}
        exit={reduce ? undefined : { opacity: 0, x: -12 }}
        transition={{ duration: reduce ? 0 : 0.36, ease: pageEase }}
      >
        <Outlet />
      </M.div>
    </AnimatePresence>
  );
};

export const DashboardLayout = () => {
  const { user, setUser } = useAuthStore();
  const isTeacher = user?.role === "teacher";
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!isAdmin) return undefined;
    // console.info("[LSQ artifacts sync] admin telemetry poll started (every 20s)");
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await adminService.getLsqArtifactsSyncTelemetry();
        if (cancelled) return;
        const t = res?.data?.data ?? res?.data;
        if (!t || typeof t !== "object") {
          // console.warn("[LSQ artifacts sync] unexpected API response", res?.data);
          return;
        }
        // Poll succeeded; admin telemetry logging disabled.
      } catch {
        // console.warn("[LSQ artifacts sync] telemetry request failed:", status ?? "?", msg);
      }
    };
    void poll();
    const id = setInterval(poll, 20000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!isTeacher || !user?.id) return;
    let active = true;
    const syncTeacherProfile = async () => {
      try {
        const { data } = await authService.getMe();
        const refreshed = data?.data;
        if (!active || !refreshed) return;
        const needsSync =
          String(user?.grade ?? "") !== String(refreshed.grade ?? "") ||
          String(user?.display ?? "") !== String(refreshed.display ?? "") ||
          String(user?.batchId ?? "") !== String(refreshed.batchId ?? "") ||
          String(user?.batchName ?? "") !== String(refreshed.batchName ?? "");
        if (needsSync) {
          setUser(refreshed);
        }
      } catch {
        // Best-effort profile refresh; keep existing session if this fails.
      }
    };
    void syncTeacherProfile();
    return () => {
      active = false;
    };
  }, [isTeacher, setUser, user?.batchId, user?.batchName, user?.display, user?.grade, user?.id]);

  if (isTeacher) {
    return (
      <div className={cn("app-shell teacher-app teacher-app--figma flex min-h-screen flex-col")}>
        <TeacherCompletionGate />
        <TeacherTopBar />
        <TeacherRoutingBar />
        <div className="flex min-h-0 flex-1">
          <TeacherSideNav />
          <main className="min-h-0 flex-1 overflow-y-auto px-6 py-10 md:px-12 md:py-12">
            <DashboardOutlet />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("app-shell flex", isAdmin && "admin-shell")}>
      <Sidebar role={user?.role} />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-4 md:p-6">
          <DashboardOutlet />
        </main>
      </div>
    </div>
  );
};
